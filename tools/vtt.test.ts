import { describe, test, expect } from "bun:test";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { parseVtt, serializeVtt, flatten, tsToSeconds } from "./lib/vtt.ts";
const TRANSCRIPTS_DIR = join(import.meta.dir, "../transcripts");

describe("parseVtt / serializeVtt", () => {
  test("parses a simple cue", () => {
    const src = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello there.\n";
    expect(parseVtt(src)).toEqual([
      { start: "00:00:00.000", end: "00:00:05.000", text: "Hello there." },
    ]);
  });

  test("parses multiple cues, in order", () => {
    const src =
      "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nFirst.\n\n00:00:05.000 --> 00:00:09.640\nSecond.\n";
    const cues = parseVtt(src);
    expect(cues.length).toBe(2);
    expect(cues[0].text).toBe("First.");
    expect(cues[1].start).toBe("00:00:05.000");
  });

  test("a lone all-digit line is cue TEXT, not a terminator", () => {
    // Confirmed against the real corpus: a spoken number transcribed alone
    // on its own line (e.g. "25") is real cue content, never a WebVTT cue-id
    // line — redact.ts's own hand-rolled parser got this wrong (see its
    // migration commit) and silently dropped these cues' text.
    const src = "WEBVTT\n\n00:01:46.340 --> 00:01:47.540\n25\n";
    expect(parseVtt(src)).toEqual([
      { start: "00:01:46.340", end: "00:01:47.540", text: "25" },
    ]);
  });

  test("multi-line cue text round-trips through \\n (never seen in the real corpus, but the format allows it)", () => {
    const src =
      "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nFirst line.\nSecond line.\n";
    const cues = parseVtt(src);
    expect(cues[0].text).toBe("First line.\nSecond line.");
    expect(serializeVtt(cues)).toBe(src);
  });

  test("an empty-text cue parses with text: \"\", not dropped", () => {
    // real in the corpus: a stretch with nothing said (silence/dead air at
    // the very end of a recording) shows up as a timestamp with no text.
    const src = "WEBVTT\n\n00:27:17.000 --> 00:27:17.000\n\n";
    expect(parseVtt(src)).toEqual([{ start: "00:27:17.000", end: "00:27:17.000", text: "" }]);
  });

  test("round-trip is byte-for-byte identical for a plain cue set", () => {
    const src =
      "WEBVTT\n\n00:00:00.000 --> 00:00:13.000\nOne.\n\n00:00:13.000 --> 00:00:18.000\nTwo.\n";
    expect(serializeVtt(parseVtt(src))).toBe(src);
  });

  test("tolerates CRLF line endings", () => {
    const src = "WEBVTT\r\n\r\n00:00:00.000 --> 00:00:05.000\r\nHello.\r\n";
    expect(parseVtt(src)).toEqual([
      { start: "00:00:00.000", end: "00:00:05.000", text: "Hello." },
    ]);
  });

  test("tolerates a missing trailing newline", () => {
    const src = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello.";
    expect(parseVtt(src)).toEqual([
      { start: "00:00:00.000", end: "00:00:05.000", text: "Hello." },
    ]);
  });

  test("empty input has no cues", () => {
    expect(parseVtt("WEBVTT\n\n")).toEqual([]);
    expect(parseVtt("")).toEqual([]);
  });

  // Known, documented limitation (inherited, not new): a line inside cue
  // TEXT that itself contains the literal substring "-->" would be
  // misparsed as a new cue boundary — every hand-rolled parser this module
  // replaces has the exact same weakness. Confirmed against the real corpus
  // (2026-09-28): all 162,239 occurrences of "-->" are timestamp lines;
  // none is spoken text. Not worth the extra state-tracking complexity to
  // guard against a case that has never once occurred in five years of
  // transcripts — documented here instead, so it isn't silently rediscovered.
  test("a literal '-->' inside cue text is NOT safely round-tripped (documented, not fixed)", () => {
    const src = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nthe path was A --> B\n";
    const cues = parseVtt(src);
    // demonstrates the known failure mode rather than asserting it's correct
    expect(cues.length).toBeGreaterThan(1);
  });
});

describe("cue ids", () => {
  test("parses a cue-identifier line", () => {
    const src = "WEBVTT\n\nc0001\n00:00:00.000 --> 00:00:05.000\nHello there.\n";
    expect(parseVtt(src)).toEqual([
      { id: "c0001", start: "00:00:00.000", end: "00:00:05.000", text: "Hello there." },
    ]);
  });

  test("id + non-id cues mix freely, id round-trips", () => {
    const src =
      "WEBVTT\n\nc0001\n00:00:00.000 --> 00:00:05.000\nFirst.\n\n00:00:05.000 --> 00:00:09.000\nSecond (no id).\n\nc0003\n00:00:09.000 --> 00:00:12.000\nThird.\n";
    const cues = parseVtt(src);
    expect(cues.map((c) => c.id)).toEqual(["c0001", undefined, "c0003"]);
    expect(serializeVtt(cues)).toBe(src);
  });

  test("a cue without an id serializes without an id line (legacy files stay legacy)", () => {
    const src = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nNo id here.\n";
    expect(serializeVtt(parseVtt(src))).toBe(src);
  });

  test("a lone all-digit cue TEXT is still never mistaken for an id line", () => {
    // the id-line branch only fires BETWEEN cues (no cue open yet); a digit
    // inside an already-open cue's text always goes to cur.lines, same as
    // any other word — this is the exact bug already fixed once, guarded
    // against regressing via the id-line addition.
    const src = "WEBVTT\n\n00:01:46.340 --> 00:01:47.540\n25\n";
    expect(parseVtt(src)).toEqual([
      { start: "00:01:46.340", end: "00:01:47.540", text: "25" },
    ]);
  });
});

describe("flatten", () => {
  test("joins multi-line text with single spaces", () => {
    expect(flatten("First line.\nSecond line.")).toBe("First line. Second line.");
  });
  test("collapses internal whitespace runs", () => {
    expect(flatten("a   b\n\nc")).toBe("a b c");
  });
  test("is a no-op on already-flat text", () => {
    expect(flatten("Hello there.")).toBe("Hello there.");
  });
});

describe("tsToSeconds", () => {
  test("HH:MM:SS.mmm", () => {
    expect(tsToSeconds("01:00:55.120")).toBeCloseTo(3655.12, 3);
  });
  test("MM:SS.mmm", () => {
    expect(tsToSeconds("00:05.000")).toBe(5);
  });
  test("00:00:00.000", () => {
    expect(tsToSeconds("00:00:00.000")).toBe(0);
  });
});

describe("round-trip against the real corpus", () => {
  // Walk every real transcript and assert parse -> serialize reproduces it,
  // modulo trailing-newline noise: ~19 files on disk carry a stray extra
  // blank line (or end on an empty final cue, which compounds the same
  // effect) at EOF — pre-existing quirks, confirmed harmless (WebVTT parsers
  // ignore blank lines) and already normalized away by every serializer this
  // module's format matches (redact.ts, edit-cli.ts both already write the
  // same canonical single-trailing-newline form). This is the real
  // acceptance bar for phase 2 (and later, phase 3's generated-VTT export):
  // if a *content* mismatch ever shows up here, fix the module, not the test.
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".vtt")) files.push(p);
    }
  };

  // The corpus is a separate repo (a git worktree — see paths.ts), which a CI
  // runner doesn't check out. This walk used to be unconditional, so without
  // it readdirSync threw ENOENT during collection and took the whole file
  // down, pure parser tests included. Guard it instead: the cases below are
  // generated per file, so an absent corpus simply produces none of them and
  // the 20 unit tests above still run everywhere (226 total with the corpus).
  const corpus = existsSync(TRANSCRIPTS_DIR);
  if (corpus) walk(TRANSCRIPTS_DIR);

  test.if(corpus)(`found transcripts to check (${files.length} files)`, () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const path of files) {
    test(`round-trips: ${path.replace(TRANSCRIPTS_DIR, "")}`, async () => {
      const src = await Bun.file(path).text();
      expect(serializeVtt(parseVtt(src))).toBe(src.replace(/\n+$/, "\n"));
    });
  }
});

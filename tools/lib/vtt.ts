/**
 * Shared WebVTT parse/serialize — the one place cue text crosses the
 * plain-text boundary. This repo is its home: the faurchive pipeline
 * (`data/pipeline/vtt.ts`) re-exports it, so there is one parser, not two.
 * The format it reads is specified in docs/FORMAT.md.
 *
 * History: Brittle Cues migration, phase 2 — replaced six
 * independently hand-rolled parsers/Cue shapes (see CUE-INVENTORY.md) that
 * had accumulated across ~24 scripts, each reaching for "whatever shape this
 * particular task needs" because there was never a shared one to reach for
 * instead.
 *
 * Format assumptions, verified against the real corpus (2026-09-28, all
 * 162,239 cues across every transcript): a `WEBVTT` header, cues separated
 * by a blank line, no `NOTE` blocks, and — notably — zero multi-line cues.
 * A lone all-digit line inside a cue (e.g. "25") is real spoken-number cue
 * TEXT here, never a cue id; treat it as ordinary text, not a terminator
 * (redact.ts's own hand-rolled parser got this wrong — see its migration
 * commit, and the corpus fix that followed it).
 *
 * `id` is the standard WebVTT cue-identifier line (a line right before the
 * timing line) — unused corpus-wide until the Brittle Cues migration's
 * phase 3, which stamps one onto every cue as a real identity independent
 * of its timestamp (verified.json's own doc comment already explains why
 * timestamp-pair identity isn't quite enough: it only survives as long as
 * nothing re-times that specific cue). Optional so every already-written
 * file still parses exactly as before; a cue without one is legacy, not
 * broken.
 *
 * `text` keeps a multi-line cue's internal line breaks (joined with `\n`),
 * so `parseVtt` -> `serializeVtt` round-trips byte-for-byte even though
 * nothing in the corpus exercises that today. Callers that just want one
 * flat string to search/compare/display — which is most of them — should
 * use `flatten()` rather than re-deciding how to join lines themselves.
 */

export type Cue = {
  /** stable identity, independent of timing — see module doc. Absent on a
   *  cue that predates the phase-3 ID backfill for its file. */
  id?: string;
  /** "HH:MM:SS.mmm", exactly as read from the file */
  start: string;
  end: string;
  /** may contain embedded "\n" for a multi-line cue — see module doc */
  text: string;
};

/** Parse a WebVTT string into its cues. Tolerant of CRLF and a missing
 *  trailing newline. A stray line before any cue has started, when it isn't
 *  immediately followed by a timing line, is dropped (matches every parser
 *  this replaces — never happens in the real corpus). */
export function parseVtt(source: string): Cue[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const cues: Cue[] = [];
  let cur: { id?: string; start: string; end: string; lines: string[] } | null = null;
  let pendingId: string | undefined;
  const flush = () => {
    if (cur) {
      cues.push({
        ...(cur.id ? { id: cur.id } : {}),
        start: cur.start,
        end: cur.end,
        text: cur.lines.join("\n"),
      });
    }
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "" || line === "WEBVTT") {
      flush();
      pendingId = undefined;
      continue;
    }
    if (line.includes("-->")) {
      flush();
      const [start, end] = line.split("-->").map((s) => s.trim().split(/\s+/)[0]);
      cur = { id: pendingId, start, end, lines: [] };
      pendingId = undefined;
    } else if (cur) {
      cur.lines.push(raw.trim());
    } else {
      // a non-blank line seen between cues, before a timing line: the
      // standard WebVTT cue-identifier. Only the line immediately before
      // "-->" counts as one — if somehow two show up in a row, the closer
      // one wins (matches the spec: exactly one id line per cue).
      pendingId = line;
    }
  }
  flush();
  return cues;
}

/** Serialize cues back to a WebVTT string — the exact format every mutator
 *  in this pipeline already wrote by hand (`"WEBVTT\n\n" + cue blocks joined
 *  by a blank line + a trailing "\n"`), with an id line prepended to a cue
 *  that has one. A cue with empty text (real in the corpus — a silent
 *  stretch at the end of a recording) would otherwise leave a stray extra
 *  blank line when it's the last one, since its block already ends in "\n"
 *  before the trailing "\n" below gets added — trimmed back to exactly one,
 *  rather than letting that one case produce different output shapes
 *  depending on what happens to be last. */
export function serializeVtt(cues: Cue[]): string {
  const body = cues
    .map((c) => `${c.id ? c.id + "\n" : ""}${c.start} --> ${c.end}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}`.replace(/\n*$/, "\n");
}

/** A cue's text with internal line breaks flattened to single spaces and
 *  whitespace collapsed — for anything that wants one clean string rather
 *  than caring about the source's original line layout (indexing, search,
 *  audit comparisons — most consumers). */
export function flatten(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

/** "HH:MM:SS.mmm" (or "MM:SS.mmm") -> seconds. Matches index-vtt.ts's
 *  existing rounding (avoids float noise like 3733.6399999999994). */
export function tsToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  let s = 0;
  for (const p of parts) s = s * 60 + p;
  return Math.round(s * 1000) / 1000;
}

/** Read + parse a .vtt file straight from disk. */
export async function readVtt(path: string): Promise<Cue[]> {
  return parseVtt(await Bun.file(path).text());
}

/** Serialize + write cues back to a .vtt file. */
export async function writeVtt(path: string, cues: Cue[]): Promise<void> {
  await Bun.write(path, serializeVtt(cues));
}

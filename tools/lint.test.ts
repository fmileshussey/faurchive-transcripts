/**
 * lint_vtt.py — the ASR grader. A reader-facing verdict rests on these rules,
 * so every case here is one the corpus actually produced.
 *
 * The clean baseline is 80 cues of a real lecture rather than a repeated
 * sentence: the first attempt at this file used one sentence 40 times over and
 * the grader failed it on the spot (n-gram loop 43%, gzip 24.5), which is the
 * grader being right. Synthetic prose cannot stand in for prose here.
 *
 * Needs only python3 (lint_vtt.py is standard library).
 */
import { test, expect, describe } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parseVtt, flatten } from "./lib/vtt.ts";
const TRANSCRIPTS_DIR = join(import.meta.dir, "../transcripts");

// resolve the interpreter and the script against this file, not the cwd
const HERE = import.meta.dir;
const PY = Bun.which("python3") ?? "python3";
const SCRIPT = join(HERE, "lint_vtt.py");
const SAMPLE = join(TRANSCRIPTS_DIR, "Gemara/Berachot/berakhot-61b-2-13-00.vtt");
const have = Bun.which("python3") !== null && existsSync(SAMPLE);

const ts = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;
};

/** 80 cues of real teaching prose, clean and un-redacted */
const PROSE = have
  ? parseVtt(await Bun.file(SAMPLE).text())
      .slice(20, 100)
      .map((c) => flatten(c.text).replace(/\s+/g, " ").trim())
      .filter(Boolean)
  : [];

/** write cues (4s each, back to back) to a .vtt and lint it */
const lint = (cues: string[], durationSec?: number) => {
  const dir = mkdtempSync(join(tmpdir(), "lintvtt-"));
  const body = ["WEBVTT", ""];
  cues.forEach((text, i) => body.push(`${ts(i * 4)} --> ${ts(i * 4 + 4)}`, text, ""));
  const f = join(dir, "t.vtt");
  writeFileSync(f, body.join("\n"));
  const args = [PY, SCRIPT, f, "--json"];
  if (durationSec) args.push("--audio-duration", String(durationSec));
  const r = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" });
  return JSON.parse(r.stdout.toString()) as {
    verdict: string; score: number; reasons: string[]; metrics: any;
  };
};

describe.skipIf(!have)("lint_vtt.py", () => {
  test("real prose passes with nothing to say", () => {
    const r = lint(PROSE);
    expect(r.verdict).toBe("pass");
    expect(r.score).toBe(0);
    expect(r.reasons).toEqual([]);
  });

  test("a word flood inside one cue fails, and names where it is", () => {
    const cues = [...PROSE];
    cues[20] = `Like the Tora says, ${"tzedek, ".repeat(24)}justice.`;
    const r = lint(cues);
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toContain("word flood: 'tzedek'");
    // the span is the point of the finding: cue 20 starts at 80s
    expect(r.metrics.word_burst.cues[0]).toBe(20);
    expect(r.metrics.word_burst.from).toBe(80);
    expect(r.reasons.join(" ")).toContain("at 1:20");
  });

  test("the same stretch redacted passes — a repair is not a defect", () => {
    // redact.ts's marker flooded the window in the loop's place, which is how
    // chapter-4-v13--26 (16 markers) came to score fail for being repaired
    const cues = [...PROSE];
    cues[20] = "Like the Tora says, [inaudible] justice.";
    for (let i = 22; i < 36; i++) cues[i] = "[inaudible]";
    const r = lint(cues);
    expect(r.verdict).toBe("pass");
    expect(r.metrics.inaudible_cues).toBe(15);
  });

  test("cues that normalise to nothing are not a repeated line", () => {
    // "..." and "—" strip to the empty string; in 14 corpus files that is the
    // most common "line", the worst at 12.9% against a 15% threshold
    const cues = [...PROSE];
    for (let i = 0; i < 20; i++) cues.push("...");
    const r = lint(cues);
    expect(r.metrics.top_line_ratio).toBeLessThan(0.1);
    expect(r.reasons.join(" ")).not.toContain("one line is");
  });

  test("a hard loop of identical cues fails", () => {
    const r = lint([...PROSE, ...Array(12).fill("Thank you.")]);
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toContain("hard loop");
  });

  test("cues running past the end of the audio are scored", () => {
    // the check used to be one-sided: only truncation counted
    const r = lint(PROSE, 60);
    expect(r.reasons.join(" ")).toContain("past the audio");
  });

  test("truncation is still scored", () => {
    const r = lint(PROSE, 900);
    expect(r.reasons.join(" ")).toContain("truncated");
  });

  test("a lecture full of conversational filler is not 'repetitive'", () => {
    // 2,217 short cues, "all right" x36, "yes" x21 — gzip 3.15, which used to
    // buy it a reader-facing warning. It holds no runaway cue at all.
    const f = join(TRANSCRIPTS_DIR, "Gemara/Berachot/berakhot-34b-ta-ne-hada-5-22-94.vtt");
    if (!existsSync(f)) return;
    const r = Bun.spawnSync([PY, SCRIPT, f, "--json"], { stdout: "pipe" });
    const j = JSON.parse(r.stdout.toString());
    expect(j.metrics.gzip_ratio).toBeGreaterThanOrEqual(3.15);
    expect(j.verdict).toBe("pass");
  });
});

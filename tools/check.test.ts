/**
 * Each diff rule is exercised the way a pull request would trip it: a tiny
 * corpus is committed as the base, one change is made on top, and the check
 * must name it. The whole-corpus rules get the same treatment without a base.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { runChecks, type Allow } from "./lib/check.ts";
import { JOINS } from "./lib/terms.ts";

const VTT = (ids = true) =>
  [
    "WEBVTT", "",
    ...(ids ? ["cue0000001"] : []), "00:00:00.000 --> 00:00:04.000", "We learn the Tora.", "",
    ...(ids ? ["cue0000002"] : []), "00:00:04.000 --> 00:00:09.500", "And the Mishna says so.", "",
  ].join("\n");

const row = (id: string, path: string, transcribed = true) => ({
  id, title: id, collection: "Talmud", sub: "Berakhot", date: null, year: null,
  durationSec: 10, sourcePath: path, transcribed,
});

function corpus(): string {
  const root = mkdtempSync(join(tmpdir(), "corpus-"));
  const w = (p: string, s: string) => {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), s);
  };
  w("transcripts/Gemara/Berachot/one.vtt", VTT());
  w("catalog.json", JSON.stringify([row("one", "Gemara/Berachot/one.mp3"), row("two", "Gemara/Berachot/two.mp3", false)], null, 2) + "\n");
  // the JOINS allowlist must be in use, or termsProblems() says it has rotted
  w("terms.json", JSON.stringify({ terms: [
    { canonical: "Tora", type: "text", translit: ["torah"], en: [], he: [] },
    { canonical: "Hashem", type: "concept", translit: [...JOINS], en: [], he: [] },
  ] }) + "\n");
  for (const f of ["citations.json", "quality.json"]) w(f, "{}\n");
  w("verified.json", JSON.stringify({ one: ["cue0000001"] }) + "\n");
  const git = (...a: string[]) => Bun.spawnSync(["git", ...a], { cwd: root });
  git("init", "-q", "-b", "base");
  git("-c", "user.email=t@example.com", "-c", "user.name=t", "add", ".");
  git("-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "base");
  git("checkout", "-qb", "pr");
  return root;
}

const run = async (root: string, base?: string, allow: Allow[] = []) =>
  runChecks({ root, base, allow: new Set(allow), asr: false });
const errs = (fs: Awaited<ReturnType<typeof run>>) => fs.filter((f) => f.level === "error").map((f) => f.rule);
const edit = (root: string, p: string, f: (s: string) => string) =>
  writeFileSync(join(root, p), f(readFileSync(join(root, p), "utf8")));

const ONE = "transcripts/Gemara/Berachot/one.vtt";

describe("whole corpus", () => {
  test("a clean corpus passes", async () => {
    const r = corpus();
    expect(errs(await run(r))).toEqual([]);
    rmSync(r, { recursive: true });
  });

  test("a transcript with no catalog row is an orphan", async () => {
    const r = corpus();
    writeFileSync(join(r, "transcripts/Gemara/Berachot/stray.vtt"), VTT(false));
    expect(errs(await run(r))).toContain("catalog/orphan");
  });

  test("a duplicate cue id is caught", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("cue0000002", "cue0000001"));
    expect(errs(await run(r))).toContain("vtt/cue-id-duplicate");
  });

  test("transcribed must agree with the files", async () => {
    const r = corpus();
    writeFileSync(join(r, "transcripts/Gemara/Berachot/two.vtt"), VTT(false));
    expect(errs(await run(r))).toContain("catalog/transcribed");
  });

  test("a bracket other than [inaudible] is caught", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("We learn", "[laughter] We learn"));
    expect(errs(await run(r))).toContain("vtt/marker");
  });

  test("verified.json may only name cues that exist", async () => {
    const r = corpus();
    writeFileSync(join(r, "verified.json"), JSON.stringify({ one: ["cue0000009"] }) + "\n");
    expect(errs(await run(r))).toContain("ref/cue");
  });

  test("a schema violation is caught", async () => {
    const r = corpus();
    writeFileSync(join(r, "citations.json"), JSON.stringify({ one: [{ cueId: "cue0000001", kind: "midrash", ref: "x" }] }) + "\n");
    expect(errs(await run(r))).toContain("json/schema");
  });

  test("a research project needs a README", async () => {
    const r = corpus();
    mkdirSync(join(r, "research/topic"), { recursive: true });
    writeFileSync(join(r, "research/topic/notes.md"), "x");
    expect(errs(await run(r))).toContain("research/readme");
  });
});

describe("the diff", () => {
  test("correcting a cue's text is allowed", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("We learn the Tora.", "We learn the Tora together."));
    expect(errs(await run(r, "base"))).toEqual([]);
  });

  test("changing a timing line is not", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("00:00:04.000 --> 00:00:09.500", "00:00:04.000 --> 00:00:09.900"));
    expect(errs(await run(r, "base"))).toContain("diff/timing-changed");
  });

  test("…unless the PR is labelled retime", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("00:00:04.000 --> 00:00:09.500", "00:00:04.000 --> 00:00:09.900"));
    expect(errs(await run(r, "base", ["retime"]))).toEqual([]);
  });

  test("changing a cue id is not allowed, even with retime", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("cue0000002", "cue0000003"));
    expect(errs(await run(r, "base", ["retime"]))).toContain("diff/cue-id-changed");
  });

  test("splitting a cue is not", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s + "\n00:00:09.500 --> 00:00:10.000\nMore.\n");
    expect(errs(await run(r, "base"))).toContain("diff/cue-count");
  });

  test("a new transcript must not carry cue ids", async () => {
    const r = corpus();
    writeFileSync(join(r, "transcripts/Gemara/Berachot/two.vtt"), VTT(true).replace(/cue000000/g, "cue900000"));
    edit(r, "catalog.json", (s) => s.replace(/("id": "two"[\s\S]*?"transcribed": )false/, "$1true"));
    expect(errs(await run(r, "base"))).toContain("diff/new-cue-ids");
  });

  test("a new transcript without ids, with its row flipped, passes", async () => {
    const r = corpus();
    writeFileSync(join(r, "transcripts/Gemara/Berachot/two.vtt"), VTT(false));
    edit(r, "catalog.json", (s) => s.replace(/("id": "two"[\s\S]*?"transcribed": )false/, "$1true"));
    expect(errs(await run(r, "base"))).toEqual([]);
  });

  test("a new transcript's timing is held to error, not warning", async () => {
    const r = corpus();
    writeFileSync(join(r, "transcripts/Gemara/Berachot/two.vtt"), VTT(false).replace("00:00:04.000 --> 00:00:09.500", "00:00:04.000 --> 00:00:03.000"));
    edit(r, "catalog.json", (s) => s.replace(/("id": "two"[\s\S]*?"transcribed": )false/, "$1true"));
    expect(errs(await run(r, "base"))).toContain("vtt/timing-inverted");
  });

  test("maintainer-written files are protected", async () => {
    const r = corpus();
    writeFileSync(join(r, "verified.json"), "{}\n");
    expect(errs(await run(r, "base"))).toContain("diff/protected");
    expect(errs(await run(r, "base", ["maintainer"]))).toEqual([]);
  });

  test("renaming a transcript is not a contributor change", async () => {
    const r = corpus();
    mkdirSync(join(r, "transcripts/Gemara/Other"), { recursive: true });
    renameSync(join(r, ONE), join(r, "transcripts/Gemara/Other/one.vtt"));
    edit(r, "catalog.json", (s) => s.replace("Gemara/Berachot/one.mp3", "Gemara/Other/one.mp3"));
    const e = errs(await run(r, "base"));
    expect(e.some((x) => x === "diff/remove" || x === "diff/catalog-source")).toBe(true);
  });

  test("a published catalog id is permanent", async () => {
    const r = corpus();
    edit(r, "catalog.json", (s) => s.replace('"id": "one"', '"id": "one-renamed"'));
    expect(errs(await run(r, "base"))).toContain("diff/catalog-id");
  });

  test("a catalog title fix is allowed", async () => {
    const r = corpus();
    edit(r, "catalog.json", (s) => s.replace('"title": "one"', '"title": "Berakhot 2a"'));
    expect(errs(await run(r, "base"))).toEqual([]);
  });

  // ---- recordings outside the maintainer's archive ----

  const external = (id: string, extra: Record<string, unknown> = {}) => ({
    id, title: "Hanukka", collection: "Festivals", sub: "Hanukka", date: "1980-12-01", year: 1980,
    durationSec: null, sourcePath: `Moadim/Hanukka/${id}.mp3`, transcribed: true,
    source: { archive: "Tape collection", ref: "1192", url: "https://example.org/recordings/1192.mp3" },
    ...extra,
  });
  const addRow = (r: string, row: object) =>
    edit(r, "catalog.json", (s) => JSON.stringify([...JSON.parse(s), row], null, 2) + "\n");
  const addVtt = (r: string, path: string) => {
    mkdirSync(dirname(join(r, path)), { recursive: true });
    writeFileSync(join(r, path), VTT(false));
  };

  test("a new external recording with its transcript passes", async () => {
    const r = corpus();
    addRow(r, external("tc-1192-hanukka"));
    addVtt(r, "transcripts/Moadim/Hanukka/tc-1192-hanukka.vtt");
    expect(errs(await run(r, "base"))).toEqual([]);
  });

  test("a new external recording can be catalogued before anyone transcribes it", async () => {
    const r = corpus();
    addRow(r, external("tc-1192-hanukka", { transcribed: false }));
    expect(errs(await run(r, "base"))).toEqual([]);
  });

  test("a new row without source is refused", async () => {
    const r = corpus();
    const { source, ...row } = external("tc-1192-hanukka");
    addRow(r, row);
    addVtt(r, "transcripts/Moadim/Hanukka/tc-1192-hanukka.vtt");
    expect(errs(await run(r, "base"))).toContain("diff/catalog-new");
  });

  test("an external row's id must be its file name", async () => {
    const r = corpus();
    addRow(r, { ...external("tc-1192-hanukka"), id: "hanukka-1980" });
    addVtt(r, "transcripts/Moadim/Hanukka/tc-1192-hanukka.vtt");
    expect(errs(await run(r, "base"))).toContain("catalog/external-id");
  });

  test("one external recording can't be catalogued twice", async () => {
    const r = corpus();
    addRow(r, external("tc-1192-hanukka", { transcribed: false }));
    addRow(r, external("tc-1192-hanukka-copy", { transcribed: false }));
    expect(errs(await run(r, "base"))).toContain("catalog/source-duplicate");
  });

  test("an external row's source can't be removed later, but its duration can change", async () => {
    const r = corpus();
    addRow(r, external("tc-1192-hanukka", { transcribed: false }));
    const git = (...a: string[]) => Bun.spawnSync(["git", "-c", "user.email=t@example.com", "-c", "user.name=t", ...a], { cwd: r });
    git("commit", "-qam", "catalogue it");
    git("branch", "-f", "base");
    edit(r, "catalog.json", (s) => s.replace('"durationSec": null', '"durationSec": 3600'));
    expect(errs(await run(r, "base"))).toEqual([]);
    edit(r, "catalog.json", (s) => JSON.stringify(JSON.parse(s).map(({ source, ...e }: any) => e), null, 2) + "\n");
    expect(errs(await run(r, "base"))).toContain("diff/catalog-source-removed");
  });

  test("a new row with an existing row's subject and date is flagged as a possible duplicate", async () => {
    const r = corpus();
    edit(r, "catalog.json", (s) => s.replace('"date": null', '"date": "1980-12-01"').replace('"sub": "Berakhot"', '"sub": "Hanukka"'));
    const git = (...a: string[]) => Bun.spawnSync(["git", "-c", "user.email=t@example.com", "-c", "user.name=t", ...a], { cwd: r });
    git("commit", "-qam", "date it");
    git("branch", "-f", "base");
    addRow(r, external("tc-1192-hanukka", { transcribed: false }));
    const fs = await run(r, "base");
    expect(errs(fs)).toEqual([]);
    expect(fs.some((f) => f.rule === "diff/catalog-maybe-duplicate")).toBe(true);
  });

  test("an off-glossary spelling in new text is a warning, not an error", async () => {
    const r = corpus();
    edit(r, ONE, (s) => s.replace("We learn the Tora.", "We learn the torah."));
    const fs = await run(r, "base");
    expect(errs(fs)).toEqual([]);
    expect(fs.some((f) => f.rule === "style/translit" && f.message.includes('"Tora"'))).toBe(true);
  });
});

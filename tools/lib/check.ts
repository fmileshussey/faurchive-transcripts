/**
 * The repository's validator. Every rule here is written down in
 * CONTRIBUTING.md ("What CI checks") — keep the two in step.
 *
 * Two passes:
 *   - the whole corpus, always: format, identity, cross-references, schemas
 *   - the diff against a base branch (`base`), for a pull request: what a
 *     contribution may and may not change. This is where the invariants that
 *     protect everything downstream live — a cue's timing and id never change
 *     in an edit, new files carry no cue ids, maintainer-written files are
 *     left alone.
 *
 * `allow` lifts diff rules for a PR the maintainer has labelled:
 *   retime      a cue's timing may change (cue ids still may not)
 *   maintainer  every diff rule is lifted
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { basename, join, relative } from "path";
import { parseVtt, serializeVtt, tsToSeconds, flatten, type Cue } from "./vtt.ts";
import { FILES } from "./schema.ts";
import { termHelpers, termsProblems, type Term } from "./terms.ts";

export type Level = "error" | "warn" | "info";
export type Finding = { level: Level; rule: string; file: string; line?: number; message: string };
export type Allow = "retime" | "maintainer";
export type Options = {
  root: string;
  /** git ref to diff against; omit for a whole-corpus check only */
  base?: string;
  allow?: Set<Allow>;
  /** run tools/lint_vtt.py on new and changed transcripts (needs python3) */
  asr?: boolean;
};

const TIMING = /^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/;
const CUE_ID = /^cue\d{7}$/;
const FILE_NAME = /^[a-z0-9-]+\.vtt$/;
const MARKER = /\[[^\]]*\]/g;
const ALLOWED_MARKER = /^\[inaudible( ~\d+s)?\]$/;
/** written only by the maintainer's pipeline — see GOVERNANCE.md */
const PROTECTED = [/^raw\//, /^verified\.json$/, /^quality\.json$/];
const STYLE_LIMIT = 15;

const vttPathFor = (sourcePath: string) => sourcePath.replace(/\.[^./]+$/, ".vtt");

function walk(dir: string, ext: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

function git(root: string, args: string[]): { ok: boolean; out: string } {
  const r = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return { ok: r.exitCode === 0, out: r.stdout.toString() };
}

/** line number (1-based) of each cue's timing line, in cue order — parseVtt
 *  opens exactly one cue per `-->` line, so the i-th one is cue i's */
function timingLines(src: string): number[] {
  const out: number[] = [];
  src.split("\n").forEach((l, i) => l.includes("-->") && out.push(i + 1));
  return out;
}

export async function runChecks(opts: Options): Promise<Finding[]> {
  const { root } = opts;
  const allow = opts.allow ?? new Set<Allow>();
  const findings: Finding[] = [];
  const add = (level: Level, rule: string, file: string, message: string, line?: number) =>
    findings.push({ level, rule, file, message, ...(line ? { line } : {}) });

  // ---- JSON files ---------------------------------------------------------
  const data: Record<string, any> = {};
  for (const [name, schema] of Object.entries(FILES)) {
    const p = join(root, name);
    if (!existsSync(p)) {
      add("error", "json/missing", name, "file is missing");
      continue;
    }
    const raw = readFileSync(p, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      add("error", "json/parse", name, `not valid JSON: ${(e as Error).message}`);
      continue;
    }
    const r = schema.safeParse(parsed);
    if (!r.success) {
      for (const issue of r.error.issues.slice(0, 20))
        add("error", "json/schema", name, `${issue.path.join(".") || "(root)"}: ${issue.message}`);
      continue;
    }
    data[name] = r.data;
    if (!raw.endsWith("\n")) add("error", "json/format", name, "must end with a newline");
  }

  const terms: Term[] = data["terms.json"]?.terms ?? [];
  for (const p of termsProblems(terms)) add("error", "terms/invariant", "terms.json", p);

  // ---- catalog ------------------------------------------------------------
  const catalog: any[] = data["catalog.json"] ?? [];
  const byVtt = new Map<string, any>();
  const byId = new Map<string, any>();
  for (const e of catalog) {
    if (byId.has(e.id)) add("error", "catalog/duplicate-id", "catalog.json", `id "${e.id}" appears twice`);
    byId.set(e.id, e);
    const v = vttPathFor(e.sourcePath);
    if (byVtt.has(v)) add("error", "catalog/duplicate-source", "catalog.json", `sourcePath "${e.sourcePath}" appears twice`);
    byVtt.set(v, e);
  }

  // ---- transcripts ----------------------------------------------------------
  const tdir = join(root, "transcripts");
  const files = walk(tdir, ".vtt");
  const added = new Set<string>(); // repo-relative, filled by the diff pass below
  const diff = opts.base ? changes(root, opts.base) : null;
  if (diff) for (const c of diff) if (c.status === "A") added.add(c.path);

  const cueOwner = new Map<string, string>(); // cue id -> repo-relative file
  const cuesOfLecture = new Map<string, Set<string>>(); // lecture id -> its cue ids
  const parsed = new Map<string, Cue[]>(); // repo-relative -> cues
  const present = new Set<string>(); // path under transcripts/

  for (const abs of files) {
    const rel = relative(root, abs);
    const under = relative(tdir, abs);
    present.add(under);
    const isNew = added.has(rel);
    if (!FILE_NAME.test(basename(abs)))
      add("error", "vtt/name", rel, "file names are lowercase ASCII letters, digits and hyphens, ending .vtt");

    const src = readFileSync(abs, "utf8");
    if (src.includes("\r")) add("error", "vtt/eol", rel, "use LF line endings, not CRLF");
    if (!src.startsWith("WEBVTT\n")) add("error", "vtt/header", rel, "the first line must be exactly WEBVTT", 1);

    const cues = parseVtt(src);
    parsed.set(rel, cues);
    const lines = timingLines(src);
    if (serializeVtt(cues) !== src.replace(/\r\n/g, "\n").replace(/\n+$/, "\n"))
      add("error", "vtt/roundtrip", rel, "does not survive parse -> serialise; see docs/FORMAT.md for the accepted shape (blank line between cues, one line of text per cue, no NOTE blocks)");

    const entry = byVtt.get(under);
    if (!entry) add("error", "catalog/orphan", rel, `no catalog.json row has sourcePath "${under.replace(/\.vtt$/, "")}.<ext>"`);
    const ids = new Set<string>();
    if (entry) cuesOfLecture.set(entry.id, ids);

    let prevStart = -1;
    cues.forEach((c, i) => {
      const line = lines[i];
      const t = `${c.start} --> ${c.end}`;
      if (!TIMING.test(t)) {
        add("error", "vtt/timing-format", rel, `timing must be HH:MM:SS.mmm --> HH:MM:SS.mmm, got "${t}"`, line);
        return;
      }
      const a = tsToSeconds(c.start), b = tsToSeconds(c.end);
      const timingLevel: Level = isNew ? "error" : "warn";
      if (a > b) add(timingLevel, "vtt/timing-inverted", rel, `cue ends before it starts (${t})`, line);
      if (a < prevStart) add(timingLevel, "vtt/timing-order", rel, `cue starts before the previous one (${t})`, line);
      prevStart = a;

      if (c.id !== undefined) {
        if (!CUE_ID.test(c.id)) add("error", "vtt/cue-id", rel, `cue id "${c.id}" is not cue + 7 digits`, line ? line - 1 : undefined);
        const other = cueOwner.get(c.id);
        if (other) add("error", "vtt/cue-id-duplicate", rel, `cue id ${c.id} is also used in ${other}`, line ? line - 1 : undefined);
        cueOwner.set(c.id, rel);
        ids.add(c.id);
      }
      for (const m of flatten(c.text).match(MARKER) ?? [])
        if (!ALLOWED_MARKER.test(m))
          add("error", "vtt/marker", rel, `"${m}": [inaudible] is the only bracketed marker (docs/FORMAT.md)`, line ? line + 1 : undefined);
    });
  }

  for (const e of catalog) {
    const has = present.has(vttPathFor(e.sourcePath));
    if (e.transcribed !== has)
      add("error", "catalog/transcribed", "catalog.json",
        `"${e.id}": transcribed is ${e.transcribed} but transcripts/${vttPathFor(e.sourcePath)} ${has ? "exists" : "does not exist"}`);
  }

  // ---- cross-references -------------------------------------------------------
  const refCheck = (file: string, map: Record<string, string[]>) => {
    for (const [lecture, cueIds] of Object.entries(map)) {
      const ids = cuesOfLecture.get(lecture);
      if (!byId.has(lecture)) { add("error", "ref/lecture", file, `"${lecture}" is not a catalog id`); continue; }
      if (!ids) { add("error", "ref/lecture", file, `"${lecture}" has no transcript`); continue; }
      const missing = cueIds.filter((c) => !ids.has(c));
      if (missing.length)
        add("error", "ref/cue", file, `"${lecture}": ${missing.length} cue id(s) not in its transcript, e.g. ${missing.slice(0, 3).join(", ")}`);
    }
  };
  if (data["verified.json"]) refCheck("verified.json", data["verified.json"]);
  if (data["citations.json"])
    refCheck("citations.json", Object.fromEntries(Object.entries(data["citations.json"] as Record<string, { cueId: string }[]>).map(([k, v]) => [k, v.map((c) => c.cueId)])));
  if (data["quality.json"])
    for (const k of Object.keys(data["quality.json"]))
      if (!present.has(`${k}.vtt`)) add("error", "ref/quality", "quality.json", `"${k}" names no transcript`);

  // ---- duplicates/ and research/ ------------------------------------------------
  for (const abs of walk(join(root, "duplicates"), ".vtt")) {
    const m = basename(abs).match(/\.DUP-of-([A-Za-z0-9_-]+)\.vtt$/);
    const rel = relative(root, abs);
    if (!m) add("warn", "duplicates/name", rel, "name it <own-name>.DUP-of-<catalog id>.vtt (duplicates/README.md)");
    else if (!byId.has(m[1])) add("warn", "duplicates/target", rel, `"${m[1]}" is not a catalog id`);
  }
  const rdir = join(root, "research");
  if (existsSync(rdir))
    for (const name of readdirSync(rdir))
      if (statSync(join(rdir, name)).isDirectory() && !existsSync(join(rdir, name, "README.md")))
        add("error", "research/readme", `research/${name}`, "every research project needs a README.md (research/README.md says what goes in it)");

  // ---- the diff -----------------------------------------------------------------
  if (diff) {
    const lift = (rule: "retime" | "any") => allow.has("maintainer") || (rule === "retime" && allow.has("retime"));
    const { replacements } = termHelpers(terms);
    const rules = replacements();

    for (const c of diff) {
      if (PROTECTED.some((re) => re.test(c.path)) && !lift("any"))
        add("error", "diff/protected", c.path, "written only by the maintainer's pipeline; leave it out of this PR (GOVERNANCE.md)");

      if (c.path === "catalog.json" && c.status === "M") catalogDiff(root, opts.base!, byId, lift("any"), add);

      if (!c.path.startsWith("transcripts/") || !c.path.endsWith(".vtt")) continue;
      if ((c.status === "D" || c.status === "R") && !lift("any")) {
        add("error", "diff/remove", c.oldPath ?? c.path,
          c.status === "D" ? "removing a transcript is a maintainer change; open an issue instead" : `renamed to ${c.path}: a transcript's path is its identity — open an issue instead`);
        continue;
      }
      const cues = parsed.get(c.path);
      if (!cues) continue;
      const lines = timingLines(readFileSync(join(root, c.path), "utf8"));
      let changedCues: number[] = cues.map((_, i) => i);

      if (c.status === "A") {
        const withIds = cues.filter((q) => q.id !== undefined).length;
        if (withIds && !lift("any"))
          add("error", "diff/new-cue-ids", c.path, `${withIds} cue id line(s): leave them off a new transcript — the maintainer numbers cues after merge, so parallel PRs can't collide`);
      } else if (c.status === "M") {
        const before = git(root, ["show", `${opts.base}:${c.path}`]);
        if (before.ok) {
          const old = parseVtt(before.out);
          changedCues = [];
          if (old.length !== cues.length && !lift("retime"))
            add("error", "diff/cue-count", c.path, `cue count changed ${old.length} -> ${cues.length}: correct the text inside existing cues; don't add, remove, split or merge them`);
          const n = Math.min(old.length, cues.length);
          let reported = 0;
          for (let i = 0; i < n; i++) {
            const o = old[i], q = cues[i];
            if ((o.id ?? "") !== (q.id ?? "") && !lift("any") && reported++ < 5)
              add("error", "diff/cue-id-changed", c.path, `cue id ${o.id ?? "(none)"} became ${q.id ?? "(none)"}: cue ids never change`, lines[i] - 1);
            if ((o.start !== q.start || o.end !== q.end) && !lift("retime") && reported++ < 5)
              add("error", "diff/timing-changed", c.path, `timing ${o.start} --> ${o.end} became ${q.start} --> ${q.end}: leave the timing line alone (a maintainer can label the PR \`retime\`)`, lines[i]);
            if (o.text !== q.text) changedCues.push(i);
          }
          for (let i = n; i < cues.length; i++) changedCues.push(i);
        }
      }

      // house spelling, only on text this PR wrote
      let style = 0;
      for (const i of changedCues) {
        const text = flatten(cues[i].text);
        for (const [re, canonical] of rules) {
          re.lastIndex = 0;
          const m = re.exec(text);
          if (!m) continue;
          if (style++ < STYLE_LIMIT)
            add("warn", "style/translit", c.path, `"${m[0]}": the house spelling is "${canonical}" (docs/TRANSLITERATION.md) — unless the audio really says otherwise`, lines[i] + 1);
          break;
        }
      }
      if (style > STYLE_LIMIT) add("warn", "style/translit", c.path, `${style - STYLE_LIMIT} more spelling suggestion(s) not shown`);

      if (opts.asr) asrGrade(root, c.path, byVtt.get(c.path.replace(/^transcripts\//, ""))?.durationSec, add);
    }
  }

  return findings;
}

type Change = { status: "A" | "M" | "D" | "R"; path: string; oldPath?: string };

/** Everything that differs from where this branch left `base` — committed,
 *  staged, unstaged and untracked — so it means the same on a contributor's
 *  machine as on CI's checkout. */
export function changes(root: string, base: string): Change[] {
  const mb = git(root, ["merge-base", base, "HEAD"]);
  if (!mb.ok) throw new Error(`can't find a merge base with "${base}" — fetch it first (git fetch origin staging)`);
  const out: Change[] = [];
  for (const line of git(root, ["diff", "--name-status", "-M", mb.out.trim()]).out.split("\n")) {
    if (!line) continue;
    const [s, a, b] = line.split("\t");
    const k = s[0] as Change["status"] | "C" | "T";
    if (k === "R") out.push({ status: "R", path: b, oldPath: a });
    else if (k === "C") out.push({ status: "A", path: b });
    else if (k === "T") out.push({ status: "M", path: a });
    else out.push({ status: k, path: a });
  }
  for (const p of git(root, ["ls-files", "--others", "--exclude-standard"]).out.split("\n"))
    if (p) out.push({ status: "A", path: p });
  return out;
}

function catalogDiff(
  root: string, base: string, now: Map<string, any>, lifted: boolean,
  add: (l: Level, r: string, f: string, m: string) => void,
) {
  const before = git(root, ["show", `${base}:catalog.json`]);
  if (!before.ok || lifted) return;
  let old: any[];
  try { old = JSON.parse(before.out); } catch { return; }
  const oldIds = new Set(old.map((e) => e.id));
  for (const id of now.keys())
    if (!oldIds.has(id))
      add("error", "diff/catalog-new", "catalog.json", `"${id}" is a new row: rows come from the maintainer's audio archive — open a "New transcript" issue for a recording that isn't catalogued`);
  for (const e of old) {
    const n = now.get(e.id);
    if (!n) add("error", "diff/catalog-id", "catalog.json", `id "${e.id}" was removed or renamed: published ids are permanent (docs/CATALOG.md)`);
    else if (n.sourcePath !== e.sourcePath)
      add("error", "diff/catalog-source", "catalog.json", `"${e.id}": sourcePath is set by the maintainer's audio archive and doesn't change in a PR`);
    else if (n.durationSec !== e.durationSec)
      add("error", "diff/catalog-duration", "catalog.json", `"${e.id}": durationSec is measured from the audio and doesn't change in a PR`);
  }
}

function asrGrade(
  root: string, path: string, durationSec: number | undefined,
  add: (l: Level, r: string, f: string, m: string) => void,
) {
  const args = ["python3", join(root, "tools/lint_vtt.py"), join(root, path), "--json"];
  if (durationSec) args.push("--audio-duration", String(durationSec));
  let r;
  try { r = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" }); } catch {
    add("info", "asr/skipped", path, "python3 not found; ASR grade skipped");
    return;
  }
  try {
    const j = JSON.parse(r.stdout.toString()) as { verdict: string; score: number; reasons: string[] };
    if (j.verdict === "pass") return;
    add(j.verdict === "fail" ? "warn" : "info", "asr/grade", path,
      `ASR grade ${j.verdict} (score ${j.score}): ${j.reasons.join("; ")} — the maintainer will listen before merging`);
  } catch {
    add("info", "asr/skipped", path, "lint_vtt.py gave no verdict");
  }
}

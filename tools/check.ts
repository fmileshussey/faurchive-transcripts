#!/usr/bin/env bun
/**
 * bun run check                          whole corpus
 * bun run check --changed origin/staging  + what this branch may change
 *   --allow retime,maintainer             lift diff rules (CI passes PR labels)
 *   --no-asr                              skip the ASR grade of changed files
 *   --json                                findings as JSON on stdout
 *
 * Exit 1 if there is any error. Warnings never fail the run. Under GitHub
 * Actions it also writes inline annotations and a job summary.
 */
import { appendFileSync } from "fs";
import { join } from "path";
import { runChecks, type Allow, type Finding } from "./lib/check.ts";

const argv = process.argv.slice(2);
const val = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const base = val("--changed");
const allow = new Set(
  (val("--allow") ?? "").split(",").map((s) => s.trim()).filter((s): s is Allow => s === "retime" || s === "maintainer"),
);
const root = join(import.meta.dir, "..");

let findings: Finding[];
try {
  findings = await runChecks({ root, base, allow, asr: !argv.includes("--no-asr") });
} catch (e) {
  console.error(`check: ${(e as Error).message}`);
  process.exit(2);
}

const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");

if (argv.includes("--json")) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  const icon = { error: "✗", warn: "!", info: "·" } as const;
  for (const [file, fs] of byFile) {
    console.log(`\n${file}`);
    for (const f of fs) console.log(`  ${icon[f.level]} ${f.line ? `${f.line}: ` : ""}${f.message}  [${f.rule}]`);
  }
  console.log(`\n${errors.length} error(s), ${warns.length} warning(s)${base ? ` — diffed against ${base}` : ""}${allow.size ? ` — allowing ${[...allow].join(", ")}` : ""}`);
}

if (process.env.GITHUB_ACTIONS) {
  const esc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  for (const f of findings) {
    if (f.level === "info") continue;
    const kind = f.level === "error" ? "error" : "warning";
    console.log(`::${kind} file=${f.file}${f.line ? `,line=${f.line}` : ""},title=${f.rule}::${esc(f.message)}`);
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const rows = findings.map((f) => `| ${f.level} | \`${f.file}\`${f.line ? `:${f.line}` : ""} | ${f.message.replace(/\|/g, "\\|")} | \`${f.rule}\` |`);
    appendFileSync(summary, [
      `## Corpus check — ${errors.length ? `❌ ${errors.length} error(s)` : "✅ no errors"}, ${warns.length} warning(s)`,
      "",
      ...(rows.length ? ["| level | where | finding | rule |", "|---|---|---|---|", ...rows.slice(0, 200)] : ["Nothing to report."]),
      rows.length > 200 ? `\n…and ${rows.length - 200} more — run \`bun run check\` locally for the full list.` : "",
      "",
    ].join("\n"));
  }
}

process.exit(errors.length ? 1 : 0);

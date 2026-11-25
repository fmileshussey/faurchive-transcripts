---
name: apply-correction
description: Apply reader suggestions filed from faurchive.com as `correction` issues — line corrections to a transcript, metadata corrections to catalog.json, suggested references to citations.json — one commit per issue on staging.
argument-hint: "<issue #> [<issue #> …]  |  (empty = list open `correction` issues)"
allowed-tools: Bash(gh issue *), Bash(git *), Bash(bun run *), Bash(grep *), Read, Edit, Grep, Glob
---

Apply reader suggestions that faurchive.com's backend filed in this repository
(`POST /api/v1/suggestion`). Read AGENTS.md first; its hard rules apply.

## Input

`$ARGUMENTS` is one or more issue numbers. If empty, run
`gh issue list -l correction -s open` and ask which to apply — never all,
unprompted.

## Before anything

- `git branch --show-current` must be `staging` or a branch off it. Never `main`.
- `git status --short` must be clean of anything you didn't write.

## Read the whole thread — body AND every comment

```sh
gh issue view <N> --json title,body,comments,state
```

One issue collects **every** suggestion one reader made for one lecture: the
body holds the first, and each later one arrives as a comment, of any kind.
Apply all of them, oldest first. If two touch the same cue, apply in order and
reconcile — or stop and report if they conflict.

## The format (fixed — written by the backend)

- **Title:** `[correction] <lectureId>[ @h:mm:ss] · <7-hex>`. The title names the
  first suggestion only; the kinds are in the headings below.
- **Body** opens with `**Lecture:** \`<lectureId>\``, possibly followed by
  `> ⚠️ lectureId not found in the current index` (then check the catalog; if the
  id truly doesn't exist, stop and report). It ends with a hidden
  `<!-- faurchive-group:… -->` marker and an "Anonymous reader submission" line
  — ignore both.
- **Each suggestion** (in the body, and as each comment) starts with a heading:
  - `### line correction · <ISO time>`
  - `### metadata correction · <ISO time>`
  - `### suggested reference · <ISO time>`
- **line** detail: `**At:** h:mm:ss · [open in the app](…?at=<id>:<sec>)`, with
  ` _(reader-adjusted)_` if the reader moved the time; then `**As transcribed:**`
  and `**Proposed:**` blockquotes; optional `**Note:**`.
- **metadata** detail: `[open the lecture in the app](…)`, then
  `**Proposed metadata:**` bullets — `**Title:**`, `**Collection:**`,
  `**Speaker / subject:**` (that is the catalog's `sub`), `**Year:**`, `**Date:**`;
  optional `**Note:**`.
- **reference** detail: `**At:** …` as above, `**Reference:** <ref> _(<kind label>)_`
  where the label is `Miqra` / `Mishna` / `Gemara` / `Other / not sure`
  (→ `miqra` / `mishna` / `gemara` / `other`); optional `**The line:**`
  blockquote; optional `**Note:**`.

## Finding the transcript

`catalog.json` row with that `id` → its `sourcePath`, extension swapped for
`.vtt`, under `transcripts/`. (The file name is not always the id.)

## Line correction

1. **As transcribed** is a *display sentence*: the app splits and merges cues
   into sentences, so it usually sits **inside** a cue, sometimes across two.
   Use **At** (and the reader-adjusted time, if any) to find the cue whose
   timing contains it, then match the text. If nothing matches closely, stop
   and report — don't guess.
2. Edit only that text, inside the cue's text line. **Never** the `-->` line or
   the id line, never split or merge cues. A reader asking for a timing change
   gets a note in your report, not an edit.
3. Apply the reader's **intent** in house spelling (AGENTS.md → Spelling): `Tora`,
   `Ribbi`, `Ḥakham`, `q`/`ṣ`/`ḥ`, hyphenated `ha-`.
4. **Gap fills.** If *As transcribed* is `[inaudible]`, the reader is filling a
   gap; their text may keep `[inaudible]` inline where they still can't hear.
   Apply it verbatim, house spelling for the real words, `[inaudible]` kept.
5. **Recurring mishearing?** Grep `transcripts/` for the *As transcribed* wording.
   If the same fix obviously applies everywhere, don't hand-edit fifty files:
   propose a `terms.json` entry (read docs/GLOSSARY.md — `translit` vs `en`) in
   its own `terms:` commit, and say in the report that the maintainer's
   correction pass must roll it out. If it is a judgement call per occurrence,
   fix only this one and note the others.

## Metadata correction

Edit the row in **`catalog.json`** — this repository is the authority. Titles
and names in the letter-for-letter register (docs/TRANSLITERATION.md). Never
`id`, `sourcePath`, `durationSec`. A `**Year:**` or `**Date:**` must agree with
each other (`date` is `YYYY-MM-DD` or null). If the reader's evidence is thin,
apply nothing and report.

## Suggested reference

Add to **`citations.json`** under the lecture id:
`{ "cueId": "<the cue's id>", "kind": "<miqra|mishna|gemara|other>", "ref": "<ref>", "note"?: "…" }`.

- Find the cue as for a line correction (**At** + **The line**). It must have an
  id; if it has none, stop and report (the maintainer numbers it first).
- Write `ref` in the letter-for-letter register (`Bĕrēʾshith 1:1`). Verify it is
  real — if the reader said "not sure", decide the kind from the ref, and if you
  can't verify the source, report rather than record it.
- Keep the list sorted by `cueId`, lectures by id.

## After each issue

1. `bun run check --changed origin/staging` — 0 errors.
2. Show the diff.
3. Commit only the files you changed, one commit per issue:
   - `corrections: <lectureId> (Fixes #N)` — line and/or metadata
   - `citation: <lectureId> — <ref> (Fixes #N)` — a reference only
4. `gh issue comment <N> --body "Applied on \`staging\` in <sha>."` Leave the issue
   open unless told to close it.
5. **Maintainer's machine only:** if the faurchive pipeline sits beside this
   repo (`../data/pipeline`), re-index the changed transcript from there:
   `bun run index-vtt.ts <abs path to .vtt> --source <Collection/Subject/name>`,
   then `bun run explore.ts`. If Meilisearch is down or the pipeline isn't there,
   skip and say so — promotion re-indexes.

## Rules

- Never push, never touch `main`, never `git add -A`.
- Stop and report on anything ambiguous: no confident cue match, conflicting
  suggestions, a metadata change with no evidence, an unverifiable reference.

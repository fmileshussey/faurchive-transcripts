---
name: add-transcript
description: Add a new transcript — for a lecture already in catalog.json (transcribed false), or for a recording held elsewhere (e.g. a Yafe Beito tape) that needs cataloguing first. Catalogues it with a `source` if needed, places the .vtt at the catalog path, strips cue ids, normalises the format, flips `transcribed`, and runs the checker.
argument-hint: "<catalog id | archive + ref, e.g. \"Yafe Beito 1192\"> <path to the .vtt>"
allowed-tools: Bash(bun run *), Bash(git *), Bash(python3 tools/lint_vtt.py *), Read, Edit, Write, Glob, Grep
---

Add one new transcript. Read AGENTS.md and docs/CATALOG.md first.

## Steps

1. **Find the row.**
   - Given a catalog id: the row with that `id`. `"transcribed": true` already →
     stop: replacing an existing transcript is a maintainer decision.
   - Given an archive and its number (e.g. Yafe Beito 1192): look for a row
     whose `source.archive` + `source.ref` match. If there is one, use it.
2. **No row → catalogue the recording** (docs/CATALOG.md, CONTRIBUTING.md §5a):
   - **First, look for the same lecture under another name** — same subject and
     date, a similar title. If it's there, add a `source` to that row (if it has
     none) and use it; don't add a second row. If unsure, stop and ask.
   - Otherwise add a row with: `id` = `<archive abbreviation>-<ref>-<a few words>`,
     lowercase ASCII (`yb-1192-hanukka`); `title`, `collection`, `sub` in the
     letter-for-letter register, using an existing collection name where one
     fits; `date`/`year` or `null`; `durationSec` in seconds or `null`;
     `sourcePath` = an existing `<Collection folder>/<Subject folder>/` that fits
     (or a new subject folder) + `<id>.<audio extension>`; `transcribed: true`;
     `source` with whatever is known (`archive`, `ref`, `url`, `recordedBy`,
     `notes`). Record any doubt about the date in `source.notes`. Keep the
     catalog sorted by `sourcePath`, 2-space JSON.
3. **Destination:** `transcripts/` + the row's `sourcePath` with its extension
   swapped for `.vtt`. Don't invent a different path or name.
4. **Normalise the file** to docs/FORMAT.md:
   - first line `WEBVTT`, blank line, then cues separated by one blank line;
     one line of text per cue (join multi-line cue text with a space); LF; one
     trailing newline;
   - timings `HH:MM:SS.mmm --> HH:MM:SS.mmm` with nothing after them (drop cue
     settings); zero-pad hours;
   - **remove every cue id line** — ids are the maintainer's to assign;
   - remove `NOTE`/`STYLE` blocks and markup (`<v …>`, `<i>`);
   - any bracketed non-speech marker other than `[inaudible]` (`[music]`,
     `[laughter]`) is removed; unclear speech stays `[inaudible]`.
   Do **not** change words beyond that — spelling corrections are a separate,
   reviewed step.
5. For an existing row, set `"transcribed": true` and change nothing else.
6. `bun run check --changed origin/staging`. Fix every error. Report the
   warnings — timing problems in a new file are errors; a possible-duplicate
   warning must be answered (is it the same lecture?); spelling suggestions and
   an ASR `fail` grade are for the human to decide (an ASR `fail` usually means
   the file needs listening to before it is merged).
7. Commit the `.vtt` and `catalog.json` only:
   `transcripts: <id> — new transcript` (add `, catalogued from <archive> <ref>`
   when you added the row).

Report: whether you catalogued it, the path, cue count, duration covered vs
`durationSec`, the ASR grade (`python3 tools/lint_vtt.py <file>` plus
`--audio-duration <durationSec>` when known), and every warning.

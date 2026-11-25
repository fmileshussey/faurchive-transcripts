---
name: add-transcript
description: Add a new transcript for a lecture already in catalog.json (transcribed false) — place the .vtt at the catalog path, strip cue ids, normalise the format, flip `transcribed`, and run the checker.
argument-hint: "<catalog id> <path to the .vtt>"
allowed-tools: Bash(bun run *), Bash(git *), Bash(python3 tools/lint_vtt.py *), Read, Edit, Write, Glob
---

Add one new transcript. Read AGENTS.md first.

## Steps

1. **Find the row.** In `catalog.json`, the row whose `id` is the first argument.
   - No such row → stop: new catalog rows come from the maintainer's audio
     archive. Suggest a "New transcript" issue.
   - `"transcribed": true` already → stop: this would replace an existing
     transcript, which is a maintainer decision.
2. **Destination:** `transcripts/` + the row's `sourcePath` with its extension
   swapped for `.vtt`. Don't invent a different path or name.
3. **Normalise the file** to docs/FORMAT.md:
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
4. Set the row's `"transcribed": true`. Change nothing else in the catalog.
5. `bun run check --changed origin/staging`. Fix every error. Report the
   warnings — timing problems in a new file are errors; spelling suggestions
   and an ASR `fail` grade are for the human to decide (an ASR `fail` usually
   means the file needs listening to before it is merged).
6. Commit the `.vtt` and `catalog.json` only:
   `transcripts: <id> — new transcript`.

Report: the path, cue count, duration covered vs `durationSec`, the ASR grade
(`python3 tools/lint_vtt.py <file> --audio-duration <durationSec>`), and every
warning.

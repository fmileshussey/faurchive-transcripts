---
name: add-citation
description: Record a line where Ḥakham Faur quotes or names a source (verse, Mishna, Gemara, other) in citations.json, keyed by the cue's id.
argument-hint: "<lecture id> <h:mm:ss | cue id> <reference> [note]"
allowed-tools: Bash(bun run *), Bash(git *), Read, Edit, Grep, Glob
---

Read AGENTS.md and docs/CITATIONS.md first.

1. **The transcript:** catalog row for the lecture id → `sourcePath` →
   `transcripts/<…>.vtt`.
2. **The cue:** by id, or the cue whose timing contains the given time. Read it
   and its neighbours: confirm the quotation is actually there. If it isn't,
   stop and report. If the cue has **no id**, stop: the maintainer must number
   it before anything can point at it.
3. **The kind:** `miqra` (Tanakh), `mishna`, `gemara`, `other`.
4. **The ref**, in the letter-for-letter register (docs/TRANSLITERATION.md):
   `Bĕrēʾshith 1:1`, `Roʾsh hashānā 1:2`, `Bĕrākhoth 33b`. Check it is the real
   source of the words quoted — don't record a reference you can't verify.
5. **The note** (optional): what he does with the source. Quoted words stay in
   his pronunciation (transcript register).
6. Add `{ "cueId", "kind", "ref", "note"? }` to `citations.json` under the lecture
   id; keep the list sorted by `cueId` and lectures by id; 2-space JSON, trailing
   newline. Don't duplicate an existing citation for the same cue and ref.
7. `bun run check --changed origin/staging` → 0 errors.
8. Commit `citations.json` only: `citation: <lecture id> — <ref>`.

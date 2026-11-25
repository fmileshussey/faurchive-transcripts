# `raw/` — the transcripts before correction

`raw/<Collection>/<Subject>/<name>.vtt` holds each transcript **as speech
recognition first wrote it**, before the glossary was applied. Same tree and
format as `transcripts/`, except that raw cues carry **no ids**.

It is maintainer-written and never overwritten: the first transcript of a
recording is the record, and a later re-transcription is a different text. Pull
requests do not touch it (the checker refuses).

## Why it is kept — and published

Correction rewrites in place, and a bad glossary rule cannot be undone from the
corrected text alone. In October 2026 a glossary carrying plurals as spellings
flattened 286 plurals into singulars across the corpus; reading `raw/` recovered
190 of them. Lectures with no raw counterpart had no such recourse.

For a researcher it is also the honest provenance of every line: what the
machine heard, against what a person decided it said.

## Comparing raw and corrected

Join on the **start timestamp**. Nothing in the correction process changes a
cue's timing, which is what makes that key safe; cue ids can't be used because
raw cues have none.

## `.vtt.rejected`

A raw file ending `.vtt.rejected` is the best attempt the speech recognition
made at a recording that still **failed** the grader (`tools/lint_vtt.py`) —
looping, truncated, or flooded with one word. It is kept so the recording is
re-attempted with a stronger engine. Treat its text with suspicion.

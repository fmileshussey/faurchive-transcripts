# Quality — `quality.json`, `verified.json` and the grader

Not every transcript is equally good, and the corpus says so rather than hiding
it. Both files are written by the maintainer's tooling; pull requests don't edit
them.

## The grader — `tools/lint_vtt.py`

Speech recognition on old, degraded audio fails in recognisable ways: it repeats
one line hundreds of times, gets stuck on a phrase, floods a passage with one
word, drifts into another script, or stops early. The grader scores a transcript
against those failures and returns **pass**, **flag** or **fail**, with reasons
and the time where it found them.

```sh
python3 tools/lint_vtt.py transcripts/Gemara/General/gemara-7-15-09.vtt --json
```

It needs only the Python standard library. CI runs it on every new or changed
transcript and reports a `fail` as a warning on the pull request. An
`[inaudible]` span is a repair, not a defect, and is not counted against a file.

## `quality.json`

Transcripts the grader did not pass, keyed by path under `transcripts/` without
`.vtt`:

```json
{ "Gemara/Megillah/masekhet-megilla-10b-11-15-94": "flag" }
```

- **flag** — degraded but usable; faurchive.com shows a notice.
- **fail** — the best attempt still failed; published anyway, with a stronger
  notice, because a flawed transcript a reader is warned about is better than
  none.

A clean transcript has no entry. Improving a flagged or failed transcript is one
of the most useful contributions there is.

## `verified.json`

Cues a person has checked, line by line, against the audio — keyed by lecture id,
listing cue ids:

```json
{ "melakhim-1-4-5-94": ["cue0074119", "cue0074120"] }
```

A passage counts as verified when every cue in it is; a lecture's verified share
is derived from that. Only cues with ids can be marked, which is one reason ids
are permanent. Verification is done by the maintainer while listening; if you
have checked a stretch carefully yourself, say which in your pull request.

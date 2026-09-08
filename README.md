# faurchive-transcripts

The corrected transcript corpus behind **[faurchive.com](https://faurchive.com)** —
full-text search over Torah audio lectures (shiurim) by Hakham José Faur.

Kept separate from the pipeline code (`faurchive_data`) and the app
(`faurchive-backend`, `faurchive-frontend`). It holds only the text that gets
indexed, plus the metadata needed to read it, so a correction is a small,
reviewable diff.

## Layout

```
transcripts/<Category>/<Subject>/<slug>.vtt   the corrected transcripts (WebVTT)
catalog.json                                  one entry per recording (id, title,
                                              collection, sub, date, year,
                                              durationSec, sourcePath, transcribed)
terms.json                                    Sephardic/Faur headword + translit /
                                              English / Hebrew variants — the term
                                              dictionary the corrections follow
```

`transcripts/` mirrors the source-audio category tree. Each `.vtt` is the output
of the pipeline's correction pass (`correct.ts`): transliteration folded to the
`terms.json` headwords, known mishearings fixed, timestamps preserved. Raw ASR
output is **not** here — it stays in the pipeline repo.

## Corrections

The "suggest a correction" control on faurchive.com posts to the backend, which
files an issue here labelled **`correction`** — one per submission:

- **line** — text as transcribed, proposed text, optional timestamp override.
- **metadata** — proposed `catalog.json` fields.

To apply one:

1. Line → edit the matching cue text in `transcripts/<...>/<slug>.vtt` (leave the
   `-->` timestamp line alone unless the issue gives an override). Keep the house
   transliteration: `q` not `k`, `Tora` not `Torah`, `Ribbi` not `Rabbi`,
   `Shelomo` not `Shlomo`, hyphenated `ha-` (`Bet ha-Midrash`, `Shir ha-Shirim`).
2. Metadata → edit the entry in `catalog.json`.
3. Commit referencing the issue (`Fixes #NN`).
4. Re-index, from the pipeline repo:
   `bun run index-vtt.ts <the .vtt> --source <Category/Subject/slug>`
   then `bun run explore.ts` to refresh `explore.json` / `catalog.json`.

Mishearings that recur across many lectures belong in the pipeline's
`correct.ts` / `terms.json`, not patched file-by-file here.

## Regenerating

`transcripts/` is reproducible: it's `data/pipeline/corrected/` after a full
`batch.ts` run. This repo is the source of truth for *hand-applied* corrections
on top of that.

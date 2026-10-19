# duplicates/

Transcripts of recordings that turned out to be a second copy of a lecture
already in `transcripts/`. **Kept, not deleted** — they are real transcription
work, and a second ASR pass over the same audio is sometimes better in places
than the one that got promoted.

Nothing here is indexed, and nothing here needs a `catalog.json` row. The
pipeline only ever walks `transcripts/` (`TRANSCRIPTS_DIR` in
`data/pipeline/paths.ts`), so files in this directory are invisible to
`index-all.ts`, `explore.ts` and `vtt.test.ts` by construction — there is no
exclusion list to keep in step.

## Naming

`<own-name>.DUP-of-<the-id-it-duplicates>.vtt`

which mirrors what `data/unsorted/` already does for the source audio, so the
two halves of a duplicate are findable from either side:

```
data/unsorted/maimonides-the-guide-april-4-2000.DUP-of-the-anthropology-of-maimonides-4-4-00.mp3
duplicates/   maimonides-the-guide-april-4-2000.DUP-of-the-anthropology-of-maimonides-4-4-00.vtt
```

## Why this directory exists

`miamonides-the-guide-april-4-2000-mp3.vtt` sat in `transcripts/` with no
catalog row — its source audio had already been triaged into `data/unsorted/`
as a duplicate, but the transcript was left behind. `index-vtt.ts` only
`console.warn`ed on a catalog miss, so it kept indexing anyway: 109 passages in
production with no collection, year or title, excluded from both facets, absent
from the Directory, and a breadcrumb falling back to *filesystem* taxonomy
instead of the curated one. Nobody saw the warning in a 200-file batch.

A catalog miss is fatal now (`--allow-orphan` overrides it deliberately), which
means a transcript either has a catalog row or it does not live in
`transcripts/`. This is where the second kind goes.

Evidence for the one here, against `the-anthropology-of-maimonides-4-4-00`:
92.9% shared word mass, 54.4% 5-gram overlap, both ~88 minutes — the same
recording, transcribed twice. The pipeline's own linter scored this copy
`flag` (1) and the promoted copy `pass` (0).

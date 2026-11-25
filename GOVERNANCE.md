# Governance

This is an open corpus with a single editor.

## The maintainer

The repository has one maintainer, who reviews and merges every change and has
the final say on what the corpus records and how. `.github/CODEOWNERS` requests
the maintainer's review on every path, and branch protection requires it.

That is deliberate. A transcript is only useful if a reader can trust that every
line in it was held to the same standard, and the fastest way to lose that is
for the standard to drift between reviewers.

## Branches

| Branch | Who writes it | How |
| --- | --- | --- |
| `staging` | everyone | pull requests, reviewed and merged by the maintainer; the maintainer's own pipeline also commits here |
| `main` | the maintainer | fast-forwarded to `staging` only (`promote`), after the regression checks pass. Never a direct commit, never a contributor PR |
| `live-YYYYMMDD-HHMM` tags | the maintainer | one per publication of `main`, for rollback |

## What contributors may and may not change

| Contributors may | Maintainer only |
| --- | --- |
| text inside a cue | a cue's timing, its id, adding or removing cues |
| a new transcript of a catalogued lecture (without cue ids) | numbering cues, moving or renaming a transcript |
| descriptive catalog fields: title, collection, sub, date, year | new catalog rows, `id`, `sourcePath`, `durationSec` |
| `terms.json` entries | applying a glossary change across the corpus |
| `citations.json` entries | `verified.json` (cues checked against the audio) |
| `research/`, `docs/`, `tools/` | `quality.json`, `raw/`, `duplicates/` |

The checker enforces the left column's limits. Two labels lift them on a pull
request, and only the maintainer applies them:

- **`retime`** — the PR may change cue timings (cue ids still may not).
- **`maintainer`** — every contribution rule is lifted; the PR is the
  maintainer's own structural change.

## Decisions

Questions of scope and standard — a transliteration choice, a new kind of data,
a research project's place in the repository — are raised as issues or
Discussions and decided by the maintainer, with the reasoning written into the
relevant file under `docs/` so the decision outlives the thread.

## Conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

# José Faur Transcription Project

Transcripts of the recorded lectures (shiurim) of **Ḥakham José Faur** — Talmud,
Tora, Jewish law and thought, from 1977 to 2013 — with the catalog, glossary and
citations that make them usable, and the tooling that keeps them consistent.

The corpus is maintained in the open so that people who knew his teaching, study
it, or simply listen carefully can correct it, extend it, and build their own
research on it.

|  |  |
| --- | --- |
| Lectures catalogued | 240 |
| Transcribed | 233 |
| Glossary headwords | 255 |

## What is here

| Path | What it is | Who writes it |
| --- | --- | --- |
| `transcripts/<Collection>/<Subject>/<name>.vtt` | The corrected transcripts, one WebVTT file per lecture — [format](docs/FORMAT.md) | everyone, by pull request |
| `catalog.json` | One row per recording: id, title, collection, subject, date, duration — [catalog](docs/CATALOG.md) | everyone (descriptive fields); maintainer (new rows) |
| `terms.json` | The glossary: his spelling of every recurring Hebrew term, and the variants that fold into it — [glossary](docs/GLOSSARY.md) | everyone, by pull request |
| `citations.json` | Lines where he quotes or names a source — [citations](docs/CITATIONS.md) | everyone, by pull request |
| `verified.json` | Cues a person has checked against the audio — [quality](docs/QUALITY.md) | maintainer |
| `quality.json` | Transcripts the machine grader flagged — [quality](docs/QUALITY.md) | maintainer |
| `raw/` | Each transcript as speech recognition first wrote it, before any correction — [raw](docs/RAW.md) | maintainer, never overwritten |
| `duplicates/` | Transcripts of second copies of a recording, kept but not indexed — [README](duplicates/README.md) | maintainer |
| `research/` | Projects built on the corpus — [README](research/README.md) | everyone, by pull request |
| `tools/` | The checker, the VTT parser, the glossary code, the ASR grader | everyone, by pull request |
| `docs/` | How everything above is shaped, and the transliteration scheme | everyone, by pull request |

## Getting started

You need [Bun](https://bun.sh) (and `python3`, for the optional ASR grade).

```sh
bun install
bun run check                        # validate the whole corpus
bun run check --changed origin/staging   # …and what your branch changes
bun test                             # the tooling's own tests
```

Then read **[CONTRIBUTING.md](CONTRIBUTING.md)**. The short version: branch from
`staging`, change text inside cues but never their timing or ids, keep the
[house transliteration](docs/TRANSLITERATION.md) unless the audio says otherwise,
open a pull request against `staging`.

## How the corpus moves

```
your branch ──PR──▶ staging ──promote──▶ main
```

- **`staging`** takes every contribution. Pull requests target it.
- **`main`** is what is published. Only the maintainer moves it, by
  fast-forwarding it to `staging` once the regression checks pass; each
  publication is tagged `live-YYYYMMDD-HHMM`.

This repository is the text and the rules for the text. Anything built on it —
search, indexing, audio — reads `main` and lives elsewhere.

## Governance

One maintainer reviews and merges everything — see [GOVERNANCE.md](GOVERNANCE.md).
Contributions are welcome; consistency is not negotiable.

## Licence

- **Code** (`tools/`, configuration): [MIT](LICENSE).
- **Transcripts and data** (everything else): [LICENSE-CONTENT](LICENSE-CONTENT).
  It covers the transcription, correction and cataloguing work in this
  repository, not the lectures themselves.

To cite the corpus, see [CITATION.cff](CITATION.cff).

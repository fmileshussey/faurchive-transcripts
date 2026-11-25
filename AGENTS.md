# AGENTS.md

Instructions for AI coding agents working in this repository. Humans: the same
rules, at more length, are in [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repository is

The transcript corpus of Ḥakham José Faur's lectures: WebVTT transcripts, a
lecture catalog, a transliteration glossary, citations, and the tooling that
validates them. It is a record of what a teacher said. **Faithfulness to the audio outranks everything else**, including
house style, tidiness and your own sense of what he meant.

```
transcripts/<Collection>/<Subject>/<name>.vtt   corrected transcripts
raw/                                            pre-correction ASR output — never edit
duplicates/                                     second copies, not indexed — never edit
catalog.json  terms.json  citations.json        editable by PR
verified.json  quality.json                     maintainer-only — never edit
research/<project>/                             contributed research, README required
tools/                                          checker, parser, glossary code, ASR grader
docs/                                           specs: FORMAT, CATALOG, GLOSSARY, CITATIONS, RAW, QUALITY, TRANSLITERATION
```

## Commands

```sh
bun install
bun run check                            # whole corpus — must be 0 errors
bun run check --changed origin/staging   # + the rules for what a branch may change
bun test                                 # tooling tests (~290, ~2s)
bun run typecheck
bun run schemas                          # after editing tools/lib/schema.ts
```

**Run `bun run check --changed origin/staging` before every commit** and fix
every error. Warnings are questions: answer them (usually by listening), don't
silence them.

## Hard rules

1. **Never change a timing line** (`HH:MM:SS.mmm --> HH:MM:SS.mmm`) **or a cue id
   line** (`cue0000000`). Edit only the text line beneath them.
2. **Never add, remove, split or merge cues.**
3. **Never write a cue id.** New transcripts carry none; the maintainer numbers
   cues after merge. Never invent or renumber one.
4. **Never edit** `raw/`, `duplicates/`, `verified.json`, `quality.json`, or a
   catalog row's `id`, `sourcePath` or `durationSec`. Never add a catalog row.
5. **Never commit to `main`.** Branch from `staging`; PRs target `staging`.
6. **Don't guess.** If you cannot tell what was said, write `[inaudible]` — the
   only bracketed marker allowed. If a correction can't be matched to a cue with
   confidence, stop and report.
7. **Ids and file names are lowercase ASCII.** Marks (ʾ ʿ ḥ ṣ ā …) go in titles
   and text only.
8. Stage only the files you changed. No `git add -A`.

## Spelling

Two registers — read [docs/TRANSLITERATION.md](docs/TRANSLITERATION.md):

- **Transcript text** follows the glossary (`terms.json` canonicals): `Tora`,
  `Ribbi`, `Shelomo`, `Ḥakham`, `q` for ק, `s`/`ṣ` for צ, hyphenated `ha-`
  (`Bet ha-Midrash`). If the audio clearly says otherwise, the audio wins.
- **Titles, collections, citation refs** follow the letter-for-letter scheme:
  `ʿAḇoḏā Zārā`, `Bĕrēʾshith 1:1`.

A reader's or contributor's spelling is not the house spelling: apply their
*intent* in house spelling.

## The glossary is dangerous

A `translit` variant in `terms.json` is find-and-replaced across the **entire**
corpus, blind to context. Before adding one, grep `transcripts/` for it and read
every hit. Glosses, names, plurals, phrases go in `en[]`, which only bridges
search. [docs/GLOSSARY.md](docs/GLOSSARY.md) has the measured damage. Never run
a corpus-wide rewrite yourself — the maintainer applies glossary changes.

## Commits

One line, prefixed: `corrections:`, `catalog:`, `citation:`, `terms:`,
`transcripts:`, `research:`, `tools:`, `docs:`. Add `(Fixes #NN)` when it closes
an issue. One commit per issue. Don't push unless asked.

## Changing the tooling

A rule added to `tools/lib/check.ts` needs a test in `tools/check.test.ts` that
fails without it, and a line in CONTRIBUTING.md's "What CI checks". A schema
change in `tools/lib/schema.ts` needs `bun run schemas`.

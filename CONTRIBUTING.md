# Contributing

Thank you for helping. This corpus is the record of a teacher's words, and every
contribution is checked against that standard: **what he said, as he said it.**

## Before you start

- For anything larger than a handful of corrections — a new transcript, a
  glossary change, a research project — **open an issue first** (there is a form
  for each). It avoids two people doing the same work, and lets the maintainer
  say early whether it fits.
- Small, obvious corrections can go straight to a pull request.
- Using an AI assistant? Point it at [AGENTS.md](AGENTS.md): it carries the same
  rules as this page, written for a machine.

## The workflow

```sh
git clone https://github.com/fmileshussey/jose-faur-transcription-project
cd jose-faur-transcription-project
git checkout staging
git checkout -b corrections/berakhot-61b      # any descriptive name
bun install

# …make your change…

bun run check --changed origin/staging        # must report 0 errors
git commit -m "corrections: berakhot-61b-2-13-00 — Ribbi Yehuda's name"
git push -u origin corrections/berakhot-61b   # (to your fork, if you have no write access)
```

Open the pull request against **`staging`**, never `main`, and fill in the
template. CI runs the same check and posts its findings on the PR.

## What you can contribute

### 1. Corrections to a transcript

Edit the text **inside** a cue. A cue looks like this:

```
cue0164196
00:00:00.000 --> 00:00:22.000
I'm happy to be here with you.
```

- **Never change the `-->` timing line or the `cue…` id line.** Other files and
  every published link point at them. If the timing itself is wrong, say so in
  the PR; the maintainer can label it `retime`.
- **Don't add, remove, split or merge cues.** Correct the words within them.
- **Listen before you write.** Every cue's timing tells you where it is in the
  recording; if you don't have the audio, ask for it in an issue. A correction
  you could not hear is a guess, and the template asks you whether you listened.
- **If you can't make a word out, write `[inaudible]`** rather than guessing. It
  is the only bracketed marker the corpus uses, and a later listener can fill it.
- Spell Hebrew the [house way](docs/TRANSLITERATION.md) (`Tora`, `Ribbi`,
  `q` for ק, `ḥ` for ח, `ha-` hyphenated) — **unless the audio really says
  otherwise**. The glossary records *his* pronunciation; faithfulness to the
  recording beats house style. The checker warns when a word you wrote has a
  house spelling; a warning is a question, not a failure.
- A mishearing that recurs across many lectures is a glossary change, not fifty
  hand edits — see 4.

Reader suggestions also arrive here as issues labelled `correction`; the
maintainer applies them.

### 2. Metadata

Fix a title, collection, subject, date or year in `catalog.json`. Titles follow
the letter-for-letter scheme in [docs/TRANSLITERATION.md](docs/TRANSLITERATION.md)
(register 1). Never change an `id` or a `sourcePath` — they are permanent — and
don't change the `durationSec` of a row without a `source`: that was measured from
the maintainer's audio ([docs/CATALOG.md](docs/CATALOG.md)).

### 3. Citations

Mark a line where he quotes or names a source — a verse, a Mishna, a line of
Gemara — in `citations.json`. Shape and reference style:
[docs/CITATIONS.md](docs/CITATIONS.md).

### 4. Glossary terms

Add or correct an entry in `terms.json`. **Read [docs/GLOSSARY.md](docs/GLOSSARY.md)
first**: a `translit` variant is rewritten into *every* transcript, so one
careless variant can damage hundreds of lines. Before adding one, search the
corpus for every occurrence of it and read them — a variant is blind to context.
Glossary changes are applied across the corpus by the maintainer after merge.

### 5. A new transcript

Most of the lectures still to be transcribed **aren't catalogued yet** — the
corpus began from the recordings on YUTorah, and other archives and private
collections hold many more. Open a "New transcript" issue first, naming the recording, so
two people don't take the same one. Then:

**a. If the lecture isn't in `catalog.json`, catalogue it** — add a row that says
where the recording comes from, with whatever you know:

```json
{
  "id": "tc-1192-hanukka",
  "title": "Ḥanukkā",
  "collection": "Festivals",
  "sub": "Ḥanukkā",
  "date": "1980-12-01",
  "year": 1980,
  "durationSec": 5628,
  "sourcePath": "Moadim UZmanim/Hanukka/tc-1192-hanukka.mp3",
  "transcribed": true,
  "source": {
    "archive": "Tape collection",
    "ref": "1192",
    "url": "https://example.org/recordings/1192.mp3"
  }
}
```

- **`source`** is what makes this a contribution rather than a recording the
  maintainer holds. Every field in it is optional — `archive`, `ref` (that
  archive's own number for it), `url`, `recordedBy`, `notes` — but give what you
  have. One recording can only be catalogued once: the checker refuses a second
  row with the same `archive` and `ref`.
- **`id`** is the file name, and is permanent. Name it
  `<archive>-<their number>-<a few words>` in lowercase ASCII — `tc-1192-hanukka`.
- **`sourcePath`** places it in the tree: pick the existing collection and subject
  folder that fits (`Gemara/Berachot/`, `Personalities/Rambam/`, …) — or a new
  subject folder — and end it with your id and the audio's extension. The
  transcript goes at the same path with `.vtt`.
- **`durationSec`** is the recording's length, or `null` if you don't know it.
- **`date`** / **`year`**: `null` when unknown. Put how you dated it, or any doubt,
  in `source.notes`.
- Before adding a row, search the catalog for the same lecture under another
  name — the checker warns when a new row shares a subject and date with an
  existing one. If it's the same lecture, add a `source` to the existing row
  instead of a new row.

You can also catalogue a recording without transcribing it (`"transcribed":
false`), so someone else can pick it up.

**b. Then the transcript itself** — for your new row, or for an existing row with
`"transcribed": false`:

- put it at `transcripts/<path>.vtt`, where `<path>` is the row's `sourcePath`
  with the extension swapped for `.vtt`;
- set that row's `transcribed` to `true`;
- **leave cue ids off** — the maintainer numbers every cue after merge, so two
  pull requests can never claim the same id;
- follow [docs/FORMAT.md](docs/FORMAT.md): one line of text per cue, a blank
  line between cues, timings that never run backwards.

### 6. Research

A project built on the corpus — an index, a concordance, an analysis, a dataset —
can live in `research/<your-project>/`. See [research/README.md](research/README.md).
Nothing there changes the corpus itself, so it is reviewed for scope and
provenance rather than line by line.

### 7. The tooling and the docs

Welcome, by pull request like everything else. A new rule in `tools/lib/check.ts`
needs a test in `tools/check.test.ts` and a line in "What CI checks" below.

## Commit messages

One line, prefixed with what kind of change it is, as the history already does:

| Prefix | For |
| --- | --- |
| `corrections:` | transcript text — `corrections: <lecture id> — <what>` |
| `catalog:` | `catalog.json` |
| `citation:` | `citations.json` |
| `terms:` | `terms.json` |
| `transcripts:` | a new transcript |
| `research:` | `research/` |
| `tools:` / `docs:` | the tooling, the documentation |

If a commit resolves an issue, end the line with `(Fixes #NN)`.

## What CI checks

`bun run check --changed origin/staging` runs on every pull request. **Errors
block the merge; warnings don't.**

**On the whole corpus**
- Every transcript parses and re-serialises unchanged; starts with `WEBVTT`;
  uses LF line endings; timings are `HH:MM:SS.mmm --> HH:MM:SS.mmm`.
- File names are lowercase ASCII letters, digits and hyphens.
- `[inaudible]` is the only bracketed marker.
- Cue ids are `cue` + 7 digits and unique across the whole corpus.
- Every transcript has a catalog row, and `transcribed` agrees with what exists.
- A row with a `source` has an id equal to its file name, and no two rows name
  the same `archive` + `ref`.
- Everything `verified.json`, `citations.json` and `quality.json` point at exists.
- The five JSON files match their schemas (`schemas/`), and the glossary holds
  its invariants (no variant deletes a word, no form claimed by two terms).
- Every `research/` project has a README.
- *Warning:* a cue that ends before it starts, or starts before the previous one
  (an error in a new transcript).

**On what your branch changes**
- No timing line and no cue id changes; no cues added or removed (`retime`
  label lifts the timing rules).
- No cue ids in a new transcript.
- No changes to `raw/`, `verified.json` or `quality.json`.
- No transcript removed or renamed; no catalog id or `sourcePath` changed; no
  `durationSec` changed on a row without a `source`; no `source` removed.
- A new catalog row must have a `source`. *Warning:* it shares a subject and date
  with an existing row (a possible duplicate).
- *Warning:* a word in text you wrote has a different house spelling.
- *Warning:* the speech-recognition grader thinks a new or changed transcript
  has failed (a loop, a flood of one word, truncation).

## After your pull request is merged

It lands on `staging`. The maintainer numbers any new cues, applies glossary
changes across the corpus, and promotes `staging` to `main`, which is the
published state. Your name stays in the history.

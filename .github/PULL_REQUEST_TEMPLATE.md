<!-- Target branch: staging (never main). See CONTRIBUTING.md. -->

## What this changes

<!-- One or two sentences. Link the issue: "Fixes #NN" / "Part of #NN". -->

**Kind** (tick all that apply):

- [ ] Corrections to transcript text
- [ ] Metadata (`catalog.json`)
- [ ] Citations (`citations.json`)
- [ ] Glossary (`terms.json`)
- [ ] New transcript
- [ ] Research (`research/`)
- [ ] Tooling / docs

**Lecture id(s):**

## How you know

- [ ] I listened to the recording at every place I changed what he said
- [ ] I didn't listen — the change is <!-- e.g. a spelling, a typo with no doubt about the word, metadata from a source --> and here is my evidence:

## Checklist

- [ ] `bun run check --changed origin/staging` reports **0 errors**
- [ ] No timing lines or cue ids changed; no cues added, removed, split or merged
- [ ] Hebrew spelled per `docs/TRANSLITERATION.md`, except where the audio says otherwise (say where)
- [ ] Glossary: I searched the corpus for every new `translit` variant and read the hits
- [ ] New transcript: no cue ids, catalog row's `transcribed` set to `true`

## Anything the reviewer should listen to?

<!-- Times (h:mm:ss) you were unsure of, or want a second ear on. -->

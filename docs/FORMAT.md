# Transcript format

Every transcript is a [WebVTT](https://www.w3.org/TR/webvtt1/) file, restricted
to a small subset of the standard so that every tool reading the corpus can
parse it the same way. `tools/lib/vtt.ts` is the parser; `bun run check`
rejects anything it cannot read back byte for byte.

## Shape

```
WEBVTT

cue0164196
00:00:00.000 --> 00:00:22.000
I'm happy to be here with you. And so, there is a question.

cue0164197
00:00:22.000 --> 00:00:31.480
The Gĕmārāʾ asks: why is this so?
```

- The first line is exactly `WEBVTT`, followed by a blank line.
- Each cue is: an optional **id line**, a **timing line**, **one line of text**.
  A blank line separates cues. The file ends with a single newline.
- LF line endings, UTF-8.
- No `NOTE` blocks, no `STYLE` or `REGION`, no cue settings after the timing,
  no `<v>` voice tags or other markup.

## Timing

`HH:MM:SS.mmm --> HH:MM:SS.mmm` — hours always present, always three decimals.
A cue's end is not before its start, and each cue starts no earlier than the one
before it. (A handful of older transcripts break this where the speech
recognition stumbled; the checker warns about those and refuses it in a new
transcript.)

**Timing is fixed.** Corrections change text, never the timing line: published
links, verified marks and the raw/corrected comparison all depend on it.

## Cue ids

`cue` followed by seven digits — `cue0164196` — and **unique across the whole
corpus**, not just within a file. An id is a cue's permanent identity:
`verified.json` and `citations.json` refer to cues by it, so it survives any
correction to the cue's text and is never reused.

Ids are assigned by the maintainer, in one series, after a transcript is merged.
A new transcript arrives **without** id lines (two pull requests numbering cues
at once would collide), and a few older transcripts still have none; that is
legitimate, it just means nothing can point at those cues yet.

## Text

- One line per cue. What he said, in the order he said it.
- Hebrew is transliterated, never written in Hebrew script, following
  [TRANSLITERATION.md](TRANSLITERATION.md) and the glossary
  ([GLOSSARY.md](GLOSSARY.md)).
- **`[inaudible]`** marks words that cannot be made out. It is the only bracketed
  marker: no `[laughter]`, `[crosstalk]` or `[music]`. It may stand alone as a
  cue's whole text or sit inline (`so-and-so [inaudible] therefore`), and a later
  listener may replace it.
- A cue may be empty (a silent stretch, usually at the end of a recording).

## File names and placement

`transcripts/<Collection>/<Subject>/<name>.vtt`. The path mirrors the audio
archive: it is the catalog row's `sourcePath` with the extension swapped for
`.vtt`. File names are lowercase ASCII letters, digits and hyphens; folder names
are the archive's own (Title Case, may contain spaces). A file's name is not its
lecture id — the catalog row is the link between the two (see
[CATALOG.md](CATALOG.md)).

## Known limitation

A literal `-->` inside cue text would be read as a timing line. It has never
occurred in the corpus; don't introduce one.

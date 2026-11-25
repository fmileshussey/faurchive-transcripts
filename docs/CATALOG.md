# The catalog

`catalog.json` is one row per recording — transcribed or not. It is the
authority for every lecture's descriptive metadata. Shape:
`schemas/catalog.schema.json`.

A row is one of two kinds:

- **an archive recording** — one the maintainer holds the audio for. Most of
  the first 240 came from YUTorah. The maintainer's pipeline adds these rows
  and measures them;
- **an external recording** — one held somewhere else (another archive, a
  private tape, another site), catalogued by a contributor. It carries a **`source`**
  saying where it comes from. Most of what is still to be transcribed is this
  kind.

```json
{
  "id": "aboda-zara-17b-2-15-00",
  "title": "ʿAḇoḏā Zārā 17b",
  "collection": "Talmuḏ",
  "sub": "ʿAḇoḏā Zārā",
  "date": "2000-02-15",
  "year": 2000,
  "durationSec": 4282,
  "sourcePath": "Gemara/Avoda Zara/aboda-zara-17b-2-15-00.mp3",
  "transcribed": true
}
```

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
  "transcribed": false,
  "source": {
    "archive": "Tape collection",
    "ref": "1192",
    "url": "https://example.org/recordings/1192.mp3"
  }
}
```

| Field | Meaning | Who changes it |
| --- | --- | --- |
| `id` | The lecture's permanent identity. Plain ASCII (`[A-Za-z0-9_-]`). For an external recording, the file name in `sourcePath`. | nobody, once published |
| `title` | Display title, in the letter-for-letter register ([TRANSLITERATION.md](TRANSLITERATION.md)) | anyone |
| `collection` | Top-level grouping (Talmuḏ, Torā Portion, Jewish Thought, …) | anyone, by agreement |
| `sub` | Subject within the collection — a tractate, a parasha, a person | anyone |
| `date` | `YYYY-MM-DD` when the day is known, else `null` | anyone |
| `year` | The year, or `null` when nothing dates the recording | anyone |
| `durationSec` | Length of the recording in seconds, or `null` if unknown | the maintainer's pipeline (archive); anyone (external) |
| `sourcePath` | The recording's place in the tree; with `.vtt` for the extension, its transcript's path | nobody, once published |
| `transcribed` | Whether `transcripts/` holds this lecture's transcript | whoever adds the transcript |
| `source` | External recordings only: `archive`, `ref`, `url`, `recordedBy`, `notes` — all optional | anyone; never removed |

## Ids are permanent

An id is written into links that cannot be edited afterwards — shared lecture
URLs, bookmarks, and every correction issue already filed. Changing one
dead-ends all of them. So an id is chosen once and never recomputed: a title can
be corrected forever, the id stays.

- **Archive recordings:** the id was derived from the recording's file name,
  folded to ASCII. That is why an id and its transcript's file name sometimes
  differ slightly — `berakhot-34b--5-29-94.vtt` is the lecture
  `berakhot-34b-5-29-94`.
- **External recordings:** the id *is* the file name, chosen by whoever
  catalogues it: `<archive>-<their number>-<a few words>`, e.g.
  `tc-1192-hanukka`. The checker enforces that the two match.

## How a transcript finds its row

By path, not by id: `sourcePath` with the extension swapped for `.vtt` is the
transcript's path under `transcripts/`. Every transcript must have a row; a
transcript that turns out to duplicate another recording goes to `duplicates/`
instead.

## One lecture, one row

The same lecture often survives in more than one archive. Before cataloguing a
recording, search for it under other titles. If it's already here, **add a
`source` to the existing row** (or extend its `notes`) rather than adding a
second row. The checker refuses two rows with the same `archive` + `ref`, and
warns when a new row shares its subject and date with an existing one.

## How the catalog is maintained

Archive recordings enter through the maintainer's pipeline, which walks the
audio archive, adds a row for anything new, measures durations, and writes this
file — **keeping every descriptive field it finds here, and every row that has a
`source`**. So a title corrected by pull request stays corrected, and an
externally held recording stays catalogued whether or not its audio ever
reaches the maintainer.

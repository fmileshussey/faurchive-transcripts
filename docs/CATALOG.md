# The catalog

`catalog.json` is one row per recording in the audio archive — transcribed or
not. It is the authority for every lecture's descriptive metadata. Shape:
`schemas/catalog.schema.json`.

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

| Field | Meaning | Who changes it |
| --- | --- | --- |
| `id` | The lecture's permanent identity. Plain ASCII (`[A-Za-z0-9_-]`). | nobody, once published |
| `title` | Display title, in the letter-for-letter register ([TRANSLITERATION.md](TRANSLITERATION.md)) | anyone |
| `collection` | Top-level grouping (Talmuḏ, Torā Portion, Jewish Thought, …) | anyone, by agreement |
| `sub` | Subject within the collection — a tractate, a parasha, a person | anyone |
| `date` | `YYYY-MM-DD` when the day is known, else `null` | anyone |
| `year` | The year, or `null` when nothing dates the recording | anyone |
| `durationSec` | Length of the recording, measured from the audio | the maintainer's pipeline |
| `sourcePath` | Where the recording sits in the audio archive | the maintainer's pipeline |
| `transcribed` | Whether `transcripts/` holds this lecture's transcript | whoever adds the transcript |

## Ids are permanent

An id is written into links that cannot be edited afterwards — shared
`faurchive.com/lecture/<id>` URLs, bookmarks, and every correction issue filed
from the site. Changing one dead-ends all of them. So an id is derived once, from
the recording's file name, folded to ASCII, and never recomputed: a title can be
corrected forever, the id stays. (That is also why an id and its transcript's
file name sometimes differ slightly — `berakhot-34b--5-29-94.vtt` is the
lecture `berakhot-34b-5-29-94`.)

## How a transcript finds its row

By path, not by id: `sourcePath` with the extension swapped for `.vtt` is the
transcript's path under `transcripts/`. Every transcript must have a row; a
transcript that turns out to duplicate another recording goes to `duplicates/`
instead.

## How the catalog is maintained

New recordings enter through the maintainer's pipeline, which walks the audio
archive, adds a row for anything new, measures durations, and writes this file —
**keeping every descriptive field it finds here**. So a title corrected by pull
request stays corrected. If you know a lecture's real date, subject or title,
fix it here.

# Citations — `citations.json`

Lines where Ḥakham Faur quotes or names a source. Keyed by lecture id, then a
list of citations, each pointing at one cue by its id. Shape:
`schemas/citations.schema.json`.

```json
{
  "bereshit-march-1989": [
    {
      "cueId": "cue0104883",
      "kind": "miqra",
      "ref": "Bĕrēʾshith 1:1",
      "note": "Recites the opening words, 'Bereshit bara Elohim'."
    }
  ]
}
```

| Field | |
| --- | --- |
| `cueId` | The cue where the quotation is — it must exist in that lecture's transcript. One cue per citation: he usually recites the opening words, which land in one cue. |
| `kind` | `miqra` (Tanakh), `mishna`, `gemara`, or `other` (Midrash, Rishonim, anything else). These four values are fixed: they are also in issues filed from faurchive.com. |
| `ref` | The reference, in the letter-for-letter register ([TRANSLITERATION.md](TRANSLITERATION.md)): `Bĕrēʾshith 1:1`, `Shĕmoth 19:11`, `Roʾsh hashānā 1:2`. Book, then chapter:verse (Tanakh) or chapter:mishna (Mishna); tractate and daf for Gemara (`Bĕrākhoth 33b`). |
| `note` | Optional. What he does with it. Quoted words are in the transcript register (his pronunciation), not the letter scheme. |

A citation needs the cue to have an id. If the line you want has none (a new or
older transcript), say so in the issue and the maintainer will number it.

Lists are kept sorted by `cueId` and lectures by id; the maintainer's tooling
rewrites the file in that order.

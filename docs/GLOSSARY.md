# The glossary — `terms.json`

The glossary records how Ḥakham Faur pronounced every recurring Hebrew and
Aramaic term, and every other way that term gets spelled. It is the
**transcript register** ([TRANSLITERATION.md](TRANSLITERATION.md), register 2):
his Sephardic pronunciation, not a letter-for-letter code. Shape:
`schemas/terms.schema.json`.

```json
{
  "canonical": "Balaq",
  "type": "parsha",
  "translit": ["balak", "bolok"],
  "en": ["parashat Balaq", "balaam"],
  "he": ["בלק"]
}
```

| Field | What it holds | What happens to it |
| --- | --- | --- |
| `canonical` | The headword: his spelling | what transcripts are corrected *to* |
| `translit[]` | Other **spellings of the same word** — Israeli, Ashkenazi, speech-recognition manglings | **rewritten to the canonical in every transcript**, and bridged in search |
| `en[]` | English glosses, other **names** for the same referent, phrases | bridged in search **only**, never rewritten |
| `he[]` | Hebrew script | bridged in search only |
| `type` | `concept`, `text`, `parsha`, `sage`, `tractate`, `figure`, `practice`, `place`, `holiday`, `people` | grouping |

Canonicals follow the Sephardic scholarly transliteration: **q** for ק
(`miqdash`), **s** for צ (`misva`), **b** for soft ב, **kh** for soft כ, **h**
for ח, qamats as `a`.

## `translit` or `en`? The one decision that matters

`tools/lib/terms.ts`'s `replacements()` turns every `translit` entry into a
find-and-replace that runs over the **whole corpus**. It cannot see context. So:

- A variant belongs in `translit` only if **every** occurrence of it, in every
  lecture, is that word. Before adding one, search the corpus for it and read
  every hit — not a sample.
- A translation, a name for the same person, a longer phrase, a plural of a
  singular headword: **`en`**. It bridges search and touches nothing.

What happens otherwise, measured on the corpus in October 2026 before there were
rules:

- **121 words deleted.** `shema yisrael -> Shemaʿ` turned "Shema Yisrael Adonai
  Eloheinu" into "Shemaʿ Adonai Eloheinu" — in all 40 occurrences.
- **99 English words turned Hebrew.** `sabbath -> Shabbat`, `cherubim -> keruvim`.
- **286 plurals flattened.** `mitzvot -> misva` (83), `ashkenazim -> Ashkenaz`
  (117): "what are the misva".
- **335 articles stripped.** `harambam -> Rambam`.
- And one quoted verse nearly rewritten into a name: a lowercase `ishaq` in
  Genesis 2:23 (*lĕzoth yiqqareʾ ʾishsha*) would have become `Yiṣḥaq`. See the
  end of TRANSLITERATION.md.

## What the checker enforces

`bun run check` (and `tools/terms.test.ts`) refuse a glossary where:

- a `translit` variant has **more words** than its canonical — the extra words
  would be deleted — unless it is one of the allow-listed joins in
  `tools/lib/terms.ts` (`JOINS`: speech recognition splitting one word in two,
  like `haram bam` for `haRambam`); adding a join is a maintainer decision;
- a form is a variant of one term and the canonical of another;
- a canonical appears twice, or any form has stray whitespace.

## How a glossary change reaches the transcripts

A merged change to `terms.json` does not rewrite anything by itself. The
maintainer runs the correction pass across the corpus, reviews its diff, and
commits that as its own change (`recorrect: …`). If your entry should *not* be
applied blindly, say so in the pull request.

## Search normalisation

Alongside the dictionary, `normalize()` in `tools/lib/terms.ts` folds spellings
that differ only at the consonant level (`tz/ts -> s`, `kh/ch -> h`, `q -> k`,
`v/w -> b`, marks stripped) so that near-variants not in the glossary still meet
in search. It is not applied to transcript text.

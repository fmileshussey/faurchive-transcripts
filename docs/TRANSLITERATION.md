# Transliteration

How Hebrew is written in Latin letters in this corpus. The scheme was settled
letter by letter by the maintainer; this file is the record, and a pull request
that departs from it will be asked to come back to it.

**Two registers, two different jobs.** The catalog (titles, collections),
citations and anything else *about* a lecture use register 1: a reversible,
letter-for-letter image of the Hebrew. The transcripts use register 2: what
Ḥakham Faur actually said, in his Sephardic pronunciation — `terms.json` is that
register and `docs/GLOSSARY.md` explains it. When you correct a transcript,
**faithfulness to the audio comes first**; house style only breaks a tie.

## Two registers

**1. Non-transcript text** — catalog titles, collection and sub-collection
names, UI labels, reference citations. The goal is an accurate, **letter-for-letter**
image of the Hebrew: one Hebrew letter, one Latin form, reversible. A reader who
knows Hebrew must be able to rebuild the spelling from the Latin.

**2. Transcript text** — what the Hakham actually said. Fidelity to the audio
comes first; the house style of register 1 only breaks a tie when the audio is
ambiguous. `terms.json`'s canonical spellings **are**
this register and do not follow the letter scheme below: `'Aboda`, `teshuba`, `Yom Tob`, `Sebi` record
his Sephardic pronunciation, not a letter code.

### Two constraints that bind every letter

- **Ids and file names stay plain ASCII.** `catalog.json`'s `id` is load-bearing:
  links into the corpus — including ones written into GitHub issues, which
  cannot be edited — carry it, so an id change dead-ends every one of them.
  Marks and diacritics live in the **display title** only; the slug folds them
  away. `Vaʾethannan` keeps the id `vaethannan`. `bun run check` enforces it.
- **Search is not affected.** A reader who types `Avoda`, `Chanuka` or `Torah`
  still finds the marked title: search tools fold the marks away (see
  `normalize()` in `tools/lib/terms.ts`). The marks are for the page, not the
  query.

## The letters

| Hebrew | Latin | Rule | Examples |
| --- | --- | --- | --- |
| א | `ʾ` (U+02BE) | **Always written**, in every position — initial, medial and final — so the Latin maps back one-to-one. | `ʾAbot` אבות · `ʾEhad` אחד · `Vaʾethannan` ואתחנן · `Haʾazinu` האזינו · `Nebiʾim` נביאים · `Ravaʾ` רבא · `Gĕmārāʾ` גמרא · `Babaʾ Batraʾ` בבא בתרא |
| ע | `ʿ` (U+02BF) | Paired with the above, and distinct from it — this is the collision the single ASCII apostrophe used to hide. | `ʿAḇoḏā Zārā` עבודה זרה · `Dēʿoth` דעות · `Babaʾ Mesiʿaʾ` בבא מציעא · `Tishʿa be-ʾAb` תשעה באב |
| בּ hard | `b` | One letter, two pointings: the hard/soft difference is audible in the Sephardic tradition, so it is marked — but with the b-family letter, never `v`. `v` stays free for ו. | `Batraʾ` בתרא · `berit` ברית |
| בֿ soft | `ḇ` (U+1E07) | As above. Decomposes to `b` + combining macron below, so search normalisation reduces it to `b` by itself. | `ʿAḇoḏā Zārā` עבודה זרה · `tĕshuḇā` תשובה · `Yom Toḇ` יום טוב · `Neḇiʾim` נביאים · `Baḇaʾ Batraʾ` בבא בתרא |
| גּ hard | `g` | Word-initial and after a dagesh. | `Gĕmārāʾ` גמרא · `galut` גלות · `geʾula` גאולה · `Gittin` גיטין · `Haggadaʾ` הגדה |
| גֿ soft | `ḡ` | Post-vocalic. | `Mĕḡillā` מגילה · `Haḡiḡā` חגיגה · `suḡyāʾ` סוגיא |
| דּ hard | `d` | Word-initial and after a dagesh. | `Dēʿoth` דעות · `Dāwiḏ` דוד (first ד) · `din` דין |
| דֿ soft | `ḏ` | Post-vocalic, including word-final — which is where it reaches the most familiar words. | `Talmuḏ` תלמוד · `ʿAḇoḏā Zārā` עבודה זרה · `Haggaḏaʾ` הגדה · `miḏrash` מדרש · `heseḏ` חסד |
| ה consonantal | `h` | Initial and medial, and the definite article. This is why ח cannot also be `h` — see that letter. | `Haggāḏā` הגדה · `halākhā` הלכה · `ha-Melekh` המלך |
| ה final | written **only with a mappiq** | A final ה without a mappiq is a vowel letter and leaves no `h`. Reversibility holds anyway: a final `-a` or `-e` with no mark can only be ה, since every א carries ʾ. | dropped: `Tora` תורה · `Mishnā` משנה · `Mĕḡillā` מגילה · `ʿAḇoḏā Zārā` עבודה זרה · `More Neḇukhim` מורה נבוכים · `Maʿase` מעשה · `Mishne Tora` משנה תורה<br>written: `gaḇoah` גבוהּ · `bah` בהּ |
| ו consonantal | `w` | The letter-faithful form. `v` is free (ב never takes it) but was declined. | `Wayyērāʾ` וירא · `Wayyēṣēʾ` ויצא · `Wāʾethḥannan` ואתחנן · `Dāwiḏ` דוד · `miṣwā` מצוה |
| ו as a vowel | `o` / `u`, unmarked | Holam and shuruq are written plain. The scheme is consonant-faithful; marking only the matres would be inconsistent with leaving every other vowel loose. | `Tora` תורה · `Yom Ṭoḇ` יום טוב · `Talmuḏ` תלמוד · `Shabuʿot` שבועות |
| ז | `z` | | `Zohar` זוהר · `gezera` גזרה |
| ח | `ḥ` (U+1E25) | `h` belongs to ה, so ח takes the dot below — the same pattern as ṭ. Reaches the site's own copy: `Ḥakham Faur` outside transcripts. | `Ḥakham` חכם · `Ḥanukka` חנוכה · `Pesaḥ` פסח · `Noaḥ` נח · `ḥeseḏ` חסד · `Mashiaḥ` משיח · `Shulḥan ʿArukh` שלחן ערוך |
| ט | `ṭ` (U+1E6D) | Hard ת is already `t`, so ט carries the dot or the two letters merge. | `Yom Ṭoḇ` יום טוב · `Giṭṭin` גיטין · `Maṭṭe Dan` מטה דן |
| י consonantal | `y` | | `Yitro` יתרו · `Yosef` יוסף |
| י as a vowel | `i` / `e`, unmarked | As ו, so the two matres match. | `Bereshit` בראשית · `Ribbi` רבי · `Mishle` משלי |
| ל מ נ ר | `l` `m` `n` `r` | No collision and no soft form. The finals ך ם ן ף ץ are the same letters and take the same forms. | `halākhā` הלכה · `Mishnā` משנה · `Niddā` נדה · `pereq` פרק |
| כּ hard | `k` | | `Kĕthuḇim` כתובים · `kāḇoḏ` כבוד |
| כֿ soft | `kh` | The digraph the corpus and the glossary already use throughout. | `Mĕlākhim` מלכים · `Lekh Lĕkhā` לך לך · `halākhā` הלכה · `Tanakh` תנך · `Ḥokhma` חכמה |
| ס | `s` | Keeps the plain letter; the other two sibilants are marked. | `Sanheḏrin` סנהדרין · `Massekheth` מסכת · `Yosēph` יוסף |
| פּ hard | `p` | | `Perush` פירוש · `pereq` פרק · `Pesaḥ` פסח |
| פֿ soft | `ph` | Chosen over `f` to match `ḡ`, `ḏ`, `kh` and `th`. | `Yosēph` יוסף · `Tosaphoth` תוספות · `Sĕphāraḏ` ספרד · `tĕphillā` תפלה |
| צ | `ṣ` (U+1E63) | The dot below, as ט and ח. Not `ts`: that is the Israeli reading, not his. | `Bēṣā` ביצה · `miṣwā` מצוה · `Ṣĕḇi` צבי · `ʾEreṣ` ארץ · `Wayyēṣēʾ` ויצא · `Ṣelem` צלם |
| ק | `q` | כ has `k`, so `q` keeps the two apart. | `Qorbān` קורבן · `miqdāsh` מקדש · `pasuq` פסוק · `qabbālā` קבלה · `Yiṣḥāq` יצחק |
| ש | `sh` | Right dot. Pairs with `ś` below. | `Mishnā` משנה · `Shĕmoth` שמות · `Moshe` משה · `Rosh ha-Shana` ראש השנה |
| שׂ | `ś` (U+015B) | Left dot — the same letter, a different sibilant. | `Śārā` שרה · `Yiśraʾel` ישראל · `śēkhel` שכל · `Maʿaśe` מעשה |
| תּ hard | `t` | Word-initial, so the common words keep a plain `t`. | `Tora` תורה · `Talmuḏ` תלמוד · `tĕshuḇā` תשובה · `Tĕhillim` תהלים |
| תֿ soft | `th` | Post-vocalic, including word-final. This vindicates the corpus file name `baba-bathra`, which had been flagged as an error. | `Baḇaʾ Bathraʾ` בבא בתרא · `Berakhoth` ברכות · `ʾAḇoth` אבות · `Bĕrēʾshith` בראשית · `Shabbāth` שבת · `Hilkhoth` הלכות |

### Why two modifier letters

U+02BE and U+02BF are the academic standard, they are letters rather than
punctuation (so they do not get "smartened" into quotes by an editor), and
search normalisation folds them away, so a reader who types plain ASCII
still finds the title.

### Spirantization: marked by pointing, for all of בגדכפת

It was proposed to mark only ב, כ and פ — the three the Sephardic tradition sounds —
and the maintainer overruled it: this register follows the **pointing**, so every
beḡadkephath letter carries a hard and a soft form. `ḏ` and `ḡ` therefore record a
Tiberian distinction the Hakham did not pronounce. That is deliberate: register 1
images the Hebrew, register 2 (the transcripts) records his speech.

**Word-initial beḡadkephath is always hard** (dagesh lene), so `Gĕmārāʾ`, `Talmuḏ`,
`Dēʿoth`, `Batraʾ` and `galut` keep a plain first letter. Only post-vocalic
positions take the mark.

**Consequence for the work:** a title can no longer be spelled by substitution.
It has to be derived from the pointed form, word by word. Standard vocabulary is
settled; names and construct forms get flagged and asked, not guessed.

**Settled:** `ḇ` stays a diacritic while the other five soft forms are digraphs
(`ḡ ḏ kh ph th`). `bh` was offered for uniformity and declined — `ḇ` reads
better in the words it lands on most.

## Vowels

The scheme is consonant-faithful and selective about vowels: it marks the three
distinctions the maintainer asked for and leaves the rest plain.

| Point | Latin | Examples |
| --- | --- | --- |
| qamats gadol | `ā` | `Torā` תורה · `Mishnā` משנה · `halākhā` הלכה · `Shabbāth` שבת |
| qamats qatan | `o` | `Ḥokhmā` חכמה · `kol` כל · `ḥoq` חק — as the Sephardic tradition reads it, so one point has two forms |
| patah | `a` | `Pesaḥ` פסח · `Shabbāth` שבת |
| sere | `ē` | `Bēṣā` ביצה · `Dēʿoth` דעות · `Bēth` בית |
| segol | `e` | `pereq` פרק · `ʾEstēr` אסתר |
| shewa naʿ | `ĕ` | `Bĕrēʾshith` בראשית · `Gĕmārāʾ` גמרא · `Shĕmoth` שמות · `Mĕḡillā` מגילה |
| shewa naḥ | nothing | `Yithro` יתרו · `Mishpāṭim` משפטים |
| hiriq | `i` | `Niddā` נדה · `miqdāsh` מקדש · `Ribbi` רבי |
| holam | `o` | `Yom Ṭoḇ` יום טוב |
| shuruq, qibbuṣ | `u` | `Talmuḏ` תלמוד · `Ḥanukkā` חנוכה |

**Ḥataf vowels are written plain** — `a`, `o`, `e` — like the short vowels they
match: `ʿAḇoḏā Zārā` עבודה, `Ḥanukkā` חנוכה, `halākhā` הלכה, `Yaʿaqoḇ` יעקב,
`ʾEloqim` אלקים. They were first written with a breve (`ă ŏ`), reasoning that a ḥataf
is a guttural's shewa and that `ĕ` is already a breve, so the mark should carry
over. That was an inference, not a decision: the instruction named three
distinctions — qamats, sere, shewa naʿ — and the ḥatafs were not among them. It
affected 18 rows and 9 words, and `ŏ` never occurred at all.

The breve therefore means exactly one thing: **shewa naʿ**.

## Structure

- **Dagesh forte doubles the letter — except ש.** `shsh` is unwritable, so a
  geminated ש is written `sh`: `Roʾsh hashānā` ראש השנה, `pereq shishi` ששי,
  `Hashēm` השם. Ḥakham Choua avoids the case altogether by never geminating
  after the article (`Sefer haShorashim`); this scheme keeps the gemination
  everywhere it can be written and drops it only here. The two words it affects
  in this corpus are those two.
- **Dagesh forte doubles the letter.** `Ḥanukkā` חנוכה · `Ribbi` רבי ·
  `Niṣṣāḇim` נצבים · `Bĕshallaḥ` בשלח · `Wayyiggaš` → `Wayyiggash` ויגש. A
  doubled letter that is also spirantizable is hard, by definition.
- **The article and the one-letter prefixes take a hyphen.** `ha-`, `bĕ-`,
  `lĕ-`, `wĕ-`, `mi-`, `she-`: `Rosh ha-Shānā` · `Tishʿā bĕ-ʾĀḇ` ·
  `halākhā lĕ-Moshe mi-Sinai` · `Torā she-bĕ-ʿal pe`. This is what the glossary
  already does.
- **Acronyms stay as they are read**, not letter by letter: `Rambam`, `Ramban`,
  `Rashi`, `Rif`, `Tanakh`.
- **Ids and file names are unaffected.** The slug folds every mark away:
  `ʿAḇoḏā Zārā` keeps the id `aboda-zara`.

## Survey: Ḥakham Isaac Choua

Checked against the one contemporary writer working in this exact tradition — he
titles himself `Ḥakham`, writes on Faur directly, and runs haSepharadi. Sources:
his Substack (*Struggling in the Wilderness*) and haSepharadi.com. His X account
refuses automated fetches (HTTP 402).

**He agrees with this scheme on every consonant:** `ʾ` `ʿ` `ḥ` `ṭ` `ṣ` `q` `ḇ`
`kh` `ph` `th`, `w` for ו, dagesh doubled, final ה dropped, and `Ribbi` / `Tora`
as the glossary already had them — `ʾemeth`, `berith`, `Bereshith`, `Ṭoḇ`,
`Aḇraham`, `Yiṣḥaq`, `Giḇʿon`, `leMaʾakhal`, `miṣwoth`, `Haḇdala`.

**Three divergences:**

1. He writes soft ג and ד as `ḡ` and `ḏ` — underline for בגד, digraph for כפת
   (`soḏ`, `ʿamuḏ`, `yeḏaʿ`, `yiphḥaḏ`, `Peleḡ haMinḥa`). **We adopted this**,
   replacing the `gh`/`dh` first chosen.
2. He marks **no vowels at all** — `Tora`, `Bereshith`, `ʿaḇoda zara`. This scheme
   marks qamats, sere and shewa naʿ, so it is markedly heavier. Deliberate.
3. His article attaches with an **internal capital and no gemination**
   (`haRambam`, `haMiṣwoth`, `beGiḇʿon`, `keʾElohim`), hyphenating instead before a
   lowercase word (`ke-elohim`). This scheme attaches, geminates and lowercases:
   `hammiqdāsh`, `hashānā`. Also deliberate.

He is not internally consistent — `Shabbath` on Substack against `Shabbat` on
haSepharadi, plain `d` in two essays against `ḏ` in another, `w` and `v` both for
ו. The eclipse essay is his most careful and the best guide to his intent.

## Settled: `Ishaq` is `Yiṣḥaq` (30 Oct 2026)

It was left open because it is a register-2 question — which of two
pronunciations he uses — and the letter scheme cannot answer it: יצחק begins
with yod either way. The corpus read 55 `Ishaq` against 14 `Yiṣḥaq`, with no
Ashkenazi form anywhere, so frequency pointed at the Judeo-Arabic form by
nearly 4:1.

The maintainer settled it by ear: every instance is the same name. `ishaq` is a
translit variant of `Yiṣḥaq`, and the 55 occurrences were re-spelled across
23 files. `Isaac` (190) stays in `en[]`, bridging search without being
rewritten.

**One case had to be hand-fixed first, and is the warning this section now
carries.** In `teshubot-8-28-09` at 00:34:45, "lezot ikare ishaq kimi ish
lukoha zot" is Genesis 2:23 — *lĕzoth yiqqareʾ ʾishsha*, "she shall be called
WOMAN". That lowercase `ishaq` is a mis-transcription of אשה, not the name,
and the new variant would have rewritten a quoted verse into the patriarch's
name. It reads `ʾishsha` now. A glossary variant is blind to context: before
adding one, read every occurrence, not a sample.

Two more were checked and left alone. `Ishaqa Muhammad` is the Arabic
Isḥāq — a different person, excluded by word boundaries. `Rabbi Ishaq
Allah-u-Aman` converts, the given name being the same name; its garbled
surname is a separate, pre-existing problem.

Found while harvesting glossary candidates (`find-terms.ts`, 29 Oct 2026).
Two further findings from the same pass, both recorded in the `terms` commit:

- **`Sephard` is two words.** 26 of its 32 occurrences are Sefarad the place;
  6 are "Sephard Tora", i.e. `Sefer Tora`, a scroll. A bare `sephard` variant
  would corrupt those six. The fix is a `Sefer Tora` entry first —
  `replacements()` sorts longest-first precisely so a phrase wins before its
  sub-token — but that is a new canonical and was not taken.
- **The classifier proposes the wrong register.** `find-terms.ts` pass 2 asks
  Groq for a "Sephardic canonical" and gets Israeli/Ashkenazi forms back:
  `Yitzhak`, `Beit HaMikdash`, `Rachamim`, `Yeremiyah`, `Torah`, `b'kavod`.
  Accepting those would make `correct.ts` rewrite the corpus *away* from his
  pronunciation — the exact inverse of the glossary's purpose. Treat the
  harvest as a detector and write the canonicals by hand.

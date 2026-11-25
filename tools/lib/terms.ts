/**
 * terms.json helpers — the glossary's one implementation. docs/GLOSSARY.md
 * explains the file; this is the code that reads it.
 *
 * translit[] holds alternative *spellings* of the same word — folded to the
 * canonical in the transcript AND bridged in search. en[] holds English glosses
 * and other *names / aliases* for the same referent (Maran, RASAG, Maimonides,
 * a full name, a book) — bridged in search ONLY, never rewritten. he[] is
 * Hebrew script (search only).
 *
 *   normalize()        transliteration normaliser — used on both indexed text
 *                      and the query so near-variants collide even
 *                      off-dictionary.
 *   termHelpers(terms) synonymsMap / canonicalize / replacements bound to one
 *                      glossary, so nothing here reads a file at import time
 *   termsProblems()    the glossary's invariants, as a list of problems —
 *                      shared by `bun run check` and tools/terms.test.ts
 *
 * Downstream tools import these and bind them to a glossary of their choosing
 * with loadTerms() + termHelpers().
 */
import { readFileSync } from "fs";

export type Term = {
  canonical: string;
  type: string;
  translit: string[];
  en: string[];
  he: string[];
};

export function loadTerms(path: string): Term[] {
  return (JSON.parse(readFileSync(path, "utf8")) as { terms: Term[] }).terms;
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];
const lc = (s: string) => s.toLowerCase().trim();

// ---- normalisation --------------------------------------------------

/**
 * Collapse the consonant-level noise that separates spellings of the same word.
 * Sephardic-leaning: tsade -> s, kuf -> k, het/khaf -> h, vet -> b. Vowel shifts
 * (Ashkenazi qamats -> o) are NOT handled here — those live in terms.json.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    // ayin / geresh / apostrophes, AND the two modifier letters the house
    // transliteration uses for א and ע (U+02BE ʾ, U+02BF ʿ). Those are
    // letters, not combining marks, so the NFKD strip above leaves them in
    // place and `ʿaboda` never matches a typed `aboda`.
    .replace(/['`ʼ‘’ʾʿ]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/tz|ts/g, "s") // tsade
    .replace(/kh|ch/g, "h") // khaf-rafe / het
    .replace(/q/g, "k") // kuf
    .replace(/c/g, "k")
    .replace(/[vw]/g, "b") // vet AND waw (Faur writes waw = w) — Israeli merges both to v
    .replace(/([a-z])\1+/g, "$1") // doubled letters
    .replace(/([aeiou])h(?=\b| )/g, "$1") // trailing h after a vowel (torah -> tora)
    .replace(/\s+/g, " ")
    .trim();
}

// ---- synonyms / canonicalisation / replacements -----------------------

// Hebrew script included so a Hebrew-script query hits the Latin transcript text
const formsFor = (t: Term) =>
  uniq([t.canonical, ...t.translit, ...t.en, ...t.he].map((s) => s.trim()).filter(Boolean));

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** marks off, letters kept — for telling an older spelling of the same word
 *  apart from a genuinely different short token */
const plainForm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʾʿ'`‘’]/g, "")
    // ב and ו are written b / ḇ / v across the two registers, so an older
    // spelling can differ from its canonical by that letter and nothing else:
    // `rava` -> `Raḇaʾ`. Without this fold the pair looks like two different
    // words and the four-character guard skips it, which left 416 occurrences
    // unconverted beside the longer words in the same pass.
    .replace(/[vw]/g, "b")
    // a word-final h is a mater and gemination is pointing — neither is a
    // different letter, so `atah` and `ʾatta` are the same word and the short-
    // token guard must not keep them apart
    .replace(/h\b/g, "")
    .replace(/([a-z])\1+/g, "$1");

// single short tokens that collide with ordinary English or Hebrew filler —
// synonyms still bridge these at search time, but don't rewrite them in text
const RISKY = new Set(["reb", "bo", "nes", "sod", "din", "amos", "noah", "rif", "rosh", "sav"]);

export function termHelpers(terms: Term[]) {
  /**
   * { form: [every other form of the same term] } — Meilisearch settings.synonyms.
   * Each form's normalize()d version is added as an extra key pointing at the
   * same group, so a normalised query still triggers the expansion.
   */
  function synonymsMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    const add = (key: string, vals: string[]) => {
      if (!key) return;
      map[key] = uniq([...(map[key] ?? []), ...vals.filter((v) => lc(v) !== lc(key))]);
    };
    for (const t of terms) {
      const group = formsFor(t);
      for (const form of group) {
        add(form, group);
        const n = normalize(form);
        if (n && n !== lc(form)) add(n, group);
      }
    }
    return map;
  }

  const REVERSE: Record<string, string> = {};
  for (const t of terms) for (const f of [...t.translit, t.canonical]) REVERSE[lc(f)] = t.canonical;

  /** A variant spelling -> its headword, or undefined if unknown. `en` glosses
   * are deliberately excluded — the correction pass fixes transliteration, it
   * does not translate his words. */
  const canonicalize = (word: string): string | undefined => REVERSE[lc(word)];

  /** [regex, canonical] for deterministic text substitution. Skips forms equal
   * to the canonical, and single tokens under 5 chars / on the risky list (too
   * many false positives). Multi-word forms are kept and matched
   * space-insensitively. */
  function replacements(): [RegExp, string][] {
    const out: [RegExp, string][] = [];
    for (const t of terms) {
      for (const v of t.translit) {
        if (lc(v) === lc(t.canonical)) continue;
        const single = !/\s/.test(v);
        // The length/RISKY guard is there because a short token invites false
        // positives. It must not apply when the variant is the SAME word in an
        // older spelling, differing only in marks: `rava` -> `Raḇaʾ` is four
        // characters and perfectly safe.
        const markOnly = plainForm(v) === plainForm(t.canonical);
        if (single && !markOnly && (v.length < 5 || RISKY.has(lc(v)))) continue;
        const body = esc(v).replace(/\s+/g, "\\s+");
        // Lookarounds, not \b: \b only asks for a word/non-word transition, and
        // ʾ ʿ ' are non-word — so `\bamida\b` matches the `Amida` inside an
        // already-corrected `ʿAmida` and prefixes the mark again (`ʿʿAmida`).
        // Excluding the marks explicitly keeps the pass idempotent, and the
        // boundary is asserted only on a side that has a word character.
        const lead = /^[\p{L}\p{N}]/u.test(v) ? "(?<![\\p{L}\\p{N}ʾʿ'])" : "";
        const tail = /[\p{L}\p{N}]$/u.test(v) ? "(?![\\p{L}\\p{N}])" : "";
        out.push([new RegExp(`${lead}${body}${tail}`, "giu"), t.canonical]);
      }
    }
    // longest first so multi-word forms win before their sub-tokens
    return out.sort((a, b) => b[0].source.length - a[0].source.length);
  }

  return { synonymsMap, canonicalize, replacements };
}

// ---- invariants -------------------------------------------------------

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Variants where the ASR split one spoken word into two, so the rewrite joins
 * rather than deletes. These are the only legitimate reason for a variant to
 * carry more words than its canonical. Adding one is a maintainer decision.
 */
export const JOINS = new Set([
  "ha shem", // -> Hashem: the article written apart
  "ha mashiach", // -> ha-Mashiah
  // "haRambam" mangled into two tokens, nine ways
  "haram bam",
  "haram bama",
  "haram bambi",
  "haram b'am",
  "haram bani",
  "haram b'av",
  "haram ba",
  "haram bham",
  "haram barma",
]);

/**
 * Every way terms.json can be wrong that a machine can see. Why each rule
 * exists (measured damage, October 2026) is in docs/GLOSSARY.md.
 */
export function termsProblems(terms: Term[]): string[] {
  const out: string[] = [];

  // A variant with MORE words than its canonical loses the difference:
  // replacements() substitutes the whole match, so the extra words are
  // destroyed in the transcript. It belongs in en[], which only bridges search.
  for (const t of terms)
    for (const v of t.translit)
      if (words(v) > words(t.canonical) && !JOINS.has(v.toLowerCase()))
        out.push(`"${v}" -> "${t.canonical}" deletes a word: move it to en[], or (maintainer) add it to JOINS`);

  const all = new Set(terms.flatMap((t) => t.translit.map((v) => v.toLowerCase())));
  for (const j of JOINS) if (!all.has(j)) out.push(`JOINS entry "${j}" is no longer a translit variant anywhere`);

  // Two terms claiming one form leaves the winner to replacements()' sort
  // order, which is nobody's deliberate choice. A variant equal to its OWN
  // canonical is inert (compared case-insensitively), so it is exempt.
  const owner = new Map(terms.map((t) => [t.canonical.toLowerCase(), t.canonical]));
  for (const t of terms)
    for (const v of t.translit) {
      const o = owner.get(v.toLowerCase());
      if (o !== undefined && o !== t.canonical) out.push(`"${v}" is a variant of "${t.canonical}" and the canonical of "${o}"`);
    }

  const seen = new Set<string>();
  for (const t of terms) {
    if (seen.has(t.canonical)) out.push(`canonical "${t.canonical}" appears twice`);
    seen.add(t.canonical);
    if (!t.canonical.length || t.canonical.trim() !== t.canonical) out.push(`canonical "${t.canonical}" has stray whitespace or is empty`);
    for (const f of [...t.translit, ...t.en, ...t.he])
      if (f.trim() !== f || !f.length) out.push(`"${t.canonical}": form "${f}" has stray whitespace or is empty`);
  }
  return out;
}

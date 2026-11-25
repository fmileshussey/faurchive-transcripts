import { expect, test, describe } from "bun:test";
import { join } from "path";
import { loadTerms, normalize, termsProblems, termHelpers, type Term } from "./lib/terms.ts";

/**
 * A guard over terms.json. Why each rule exists — the damage a blind
 * replacement did to the corpus before there were rules — is in
 * docs/GLOSSARY.md. The rules themselves live in termsProblems(), which
 * `bun run check` also runs; these tests pin that each rule fires.
 */
const TERMS = loadTerms(join(import.meta.dir, "../terms.json"));
const t = (canonical: string, translit: string[] = [], en: string[] = []): Term => ({
  canonical, type: "concept", translit, en, he: [],
});

describe("terms.json", () => {
  test("the real glossary has no problems", () => {
    expect(termsProblems(TERMS)).toEqual([]);
  });

  test("a variant that would delete a word is caught", () => {
    expect(termsProblems([t("Shemaʿ", ["shema yisrael"])]).join()).toContain("deletes a word");
  });

  test("an allow-listed join is not", () => {
    expect(termsProblems([t("Hashem", ["ha shem"])]).filter((p) => p.includes("deletes"))).toEqual([]);
  });

  test("a form claimed by two terms is caught", () => {
    expect(termsProblems([t("Ladino", []), t("Judezmo", ["ladino"])]).join()).toContain("canonical of");
  });

  test("stray whitespace is caught", () => {
    expect(termsProblems([t("Tora", ["torah "])]).join()).toContain("stray whitespace");
  });

  /**
   * ʾ (U+02BE) and ʿ (U+02BF) are modifier LETTERS, not combining marks, so
   * NFKD leaves them in place. Until they were stripped, no plain-ASCII query
   * could reach a marked title (`aboda zara`, `rosh hashana`: 0 matches).
   */
  test("normalize strips the house transliteration's marks", () => {
    const pairs: [string, string][] = [
      ["ʿAḇoḏā Zārā", "aboda zara"],
      ["Roʾsh hashānā", "rosh hashana"],
      ["Bāḇāʾ Bathrāʾ", "baba batra"],
      ["Gĕmārāʾ", "gemara"],
      ["Ṣĕḇi", "sebi"],
      ["Yiśraʾel", "yisrael"],
      ["Ṭoḇ", "tob"],
      ["Mishpāṭim", "mishpatim"],
    ];
    for (const [marked, plain] of pairs) expect(normalize(marked)).toBe(plain);
  });

  test("no mark survives normalisation", () => {
    const marks = /[ʾʿĀ-ſḀ-ỿ]/;
    for (const term of TERMS) expect(normalize(term.canonical)).not.toMatch(marks);
  });

  test("replacements are idempotent beside a leading mark", () => {
    const { replacements } = termHelpers([t("ʿAmida", ["amida"])]);
    const apply = (s: string) => replacements().reduce((acc, [re, c]) => acc.replace(re, c), s);
    expect(apply("the amida")).toBe("the ʿAmida");
    expect(apply(apply("the amida"))).toBe("the ʿAmida");
  });
});

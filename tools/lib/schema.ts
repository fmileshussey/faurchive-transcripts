/**
 * The shape of every JSON file at the repo root. docs/ explains what each
 * field *means*; this is what `bun run check` enforces, and what
 * `bun run schemas` writes out as schemas/*.schema.json for editors.
 */
import { z } from "zod";

/** Plain ASCII, permanent once published — see docs/CATALOG.md. Same rule as
 *  the faurchive backend's LectureId, which writes ids into GitHub issues. */
export const LectureId = z.string().regex(/^[A-Za-z0-9_-]+$/).max(128);
/** `cue` + 7 digits, one series across the whole corpus — docs/FORMAT.md */
export const CueId = z.string().regex(/^cue\d{7}$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CatalogEntry = z
  .object({
    id: LectureId,
    title: z.string().min(1),
    collection: z.string().min(1),
    sub: z.string(),
    date: IsoDate.nullable(),
    year: z.number().int().min(1900).max(2100).nullable(),
    durationSec: z.number().nonnegative(),
    /** where the recording sits in the audio archive; with the extension
     *  swapped for .vtt it is the transcript's path under transcripts/ */
    sourcePath: z.string().regex(/^[^/].*\.[A-Za-z0-9]+$/),
    transcribed: z.boolean(),
  })
  .strict();
export const Catalog = z.array(CatalogEntry);

export const TermType = z.enum([
  "concept", "text", "parsha", "sage", "tractate", "figure",
  "practice", "place", "holiday", "people",
]);
export const Term = z
  .object({
    canonical: z.string().min(1),
    type: TermType,
    translit: z.array(z.string()),
    en: z.array(z.string()),
    he: z.array(z.string()),
  })
  .strict();
export const Terms = z.object({ _note: z.string().optional(), terms: z.array(Term) }).strict();

export const CITATION_KINDS = ["miqra", "mishna", "gemara", "other"] as const;
export const Citation = z
  .object({ cueId: CueId, kind: z.enum(CITATION_KINDS), ref: z.string().min(1), note: z.string().optional() })
  .strict();
export const Citations = z.record(LectureId, z.array(Citation));

/** keyed by the transcript's path under transcripts/, without `.vtt` */
export const Quality = z.record(z.string(), z.enum(["flag", "fail"]));

export const Verified = z.record(LectureId, z.array(CueId));

export const FILES = {
  "catalog.json": Catalog,
  "terms.json": Terms,
  "citations.json": Citations,
  "quality.json": Quality,
  "verified.json": Verified,
} as const;

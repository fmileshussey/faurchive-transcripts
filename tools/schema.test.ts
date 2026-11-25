import { expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { renderSchemas } from "./lib/emit.ts";

test("schemas/ matches tools/lib/schema.ts (run `bun run schemas` after changing it)", () => {
  for (const [name, text] of renderSchemas())
    expect(readFileSync(join(import.meta.dir, "../schemas", name), "utf8")).toBe(text);
});

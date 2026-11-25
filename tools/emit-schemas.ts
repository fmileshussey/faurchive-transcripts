/**
 * bun run schemas — write schemas/<file>.schema.json from tools/lib/schema.ts,
 * so an editor can validate catalog.json & co. as you type. The zod schemas
 * are the source; these are generated and committed. A test fails if they
 * drift (tools/schema.test.ts).
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { renderSchemas } from "./lib/emit.ts";

for (const [name, text] of renderSchemas()) writeFileSync(join(import.meta.dir, "../schemas", name), text);
console.log("wrote schemas/*.schema.json");

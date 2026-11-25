import { z } from "zod";
import { FILES } from "./schema.ts";

/** [file name under schemas/, its JSON Schema text] for each root JSON file */
export function renderSchemas(): [string, string][] {
  return Object.entries(FILES).map(([file, schema]) => [
    file.replace(/\.json$/, ".schema.json"),
    JSON.stringify({ ...z.toJSONSchema(schema), title: file }, null, 2) + "\n",
  ]);
}

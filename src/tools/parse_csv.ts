import { readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

export const parseCsvInputSchema = z.object({
  path: z.string()
});

export type ParseCsvInput = z.infer<typeof parseCsvInputSchema>;

export type ParsedCsvRow = Record<string, string>;

export const parseCsvJsonSchema = {
  type: "object",
  required: ["path"],
  properties: {
    path: { type: "string", description: "Ścieżka do pliku CSV" }
  }
} as const;

export function parseCsvTool(input: ParseCsvInput): {
  headers: string[];
  rows: ParsedCsvRow[];
} {
  const safePath = resolve(process.cwd(), input.path);
  if (!safePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony");
  }

  try {
    const content = readFileSync(safePath, "utf-8").trim();
    if (!content) {
      return { headers: [], rows: [] };
    }

    const lines = content.split(/\r?\n/);
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine.split(",").map((header) => header.trim());

    const rows = dataLines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const values = line.split(",").map((value) => value.trim());
        return headers.reduce<ParsedCsvRow>((accumulator, header, index) => {
          accumulator[header] = values[index] ?? "";
          return accumulator;
        }, {});
      });

    return { headers, rows };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd parsowania CSV: ${message}`);
  }
}

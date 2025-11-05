import { readFileSync } from "fs";
import { relative, resolve } from "path";
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

const projectRoot = process.cwd();

function resolveProjectPath(requestedPath: string) {
  const absolutePath = resolve(projectRoot, requestedPath);
  const relativePath = relative(projectRoot, absolutePath);
  if (relativePath.startsWith("..")) {
    throw new Error("❌ Dostęp zabroniony: plik poza katalogiem projektu");
  }
  return absolutePath;
}

export function parseCsvTool(input: ParseCsvInput): {
  headers: string[];
  rows: ParsedCsvRow[];
} {
  const safePath = resolveProjectPath(input.path);

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

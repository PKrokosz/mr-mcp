import { resolve } from "path";
import { z } from "zod";

import { parseCsvTool, parseCsvInputSchema } from "./parse_csv.js";

export const analyzeDataInputSchema = z.object({
  path: parseCsvInputSchema.shape.path,
  column: z.string()
});

export type AnalyzeDataInput = z.infer<typeof analyzeDataInputSchema>;

export const analyzeDataJsonSchema = {
  type: "object",
  required: ["path", "column"],
  properties: {
    path: { type: "string", description: "Ścieżka do pliku CSV" },
    column: { type: "string", description: "Kolumna do analizy" }
  }
} as const;

export function analyzeDataTool(input: AnalyzeDataInput): {
  column: string;
  count: number;
  numericCount: number;
  min: number | null;
  max: number | null;
  sum: number;
  average: number | null;
  median: number | null;
} {
  const safePath = resolve(process.cwd(), input.path);
  if (!safePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony");
  }

  const { headers, rows } = parseCsvTool({ path: input.path });
  if (!headers.includes(input.column)) {
    throw new Error(`❌ Kolumna '${input.column}' nie istnieje w pliku CSV`);
  }

  const numericValues = rows
    .map((row) => Number.parseFloat(row[input.column] ?? ""))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return {
      column: input.column,
      count: rows.length,
      numericCount: 0,
      min: null,
      max: null,
      sum: 0,
      average: null,
      median: null
    };
  }

  const sorted = [...numericValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((accumulator, value) => accumulator + value, 0);
  const average = sum / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return {
    column: input.column,
    count: rows.length,
    numericCount: sorted.length,
    min,
    max,
    sum,
    average,
    median
  };
}

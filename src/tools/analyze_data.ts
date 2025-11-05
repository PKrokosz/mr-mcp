import { z } from "zod";

import { parseCsvInputSchema, parseCsvTool } from "./parse_csv.js";

export const analyzeDataInputSchema = z.object({
  path: parseCsvInputSchema.shape.path,
  column: z.string().optional()
});

export type AnalyzeDataInput = z.infer<typeof analyzeDataInputSchema>;

export type AnalyzeDataOutput = {
  totalRows: number;
  columns: string[];
  sample: Record<string, string>[];
  columnStats?: {
    column: string;
    uniqueCount: number;
    topValues: string[];
  };
};

export const analyzeDataJsonSchema = {
  type: "object",
  required: ["path"],
  properties: {
    path: { type: "string", description: "Ścieżka do pliku CSV" },
    column: {
      type: "string",
      description: "Nazwa kolumny do analizy (opcjonalna)"
    }
  }
} as const;

export function analyzeDataTool(input: AnalyzeDataInput): AnalyzeDataOutput {
  try {
    const { rows, headers } = parseCsvTool({ path: input.path });

    const stats: AnalyzeDataOutput = {
      totalRows: rows.length,
      columns: headers,
      sample: rows.slice(0, 3)
    };

    if (input.column && headers.includes(input.column)) {
      const values = rows
        .map((row) => row[input.column])
        .filter((value) => value !== undefined);
      const uniqueValues = [...new Set(values)];

      stats.columnStats = {
        column: input.column,
        uniqueCount: uniqueValues.length,
        topValues: uniqueValues.slice(0, 5)
      };
    }

    return stats;
  } catch (error) {
    throw new Error(
      `❌ Błąd analizy: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

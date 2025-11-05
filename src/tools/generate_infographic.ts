import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { z } from "zod";

import { parseCsvTool } from "./parse_csv.js";

export const generateInfographicInputSchema = z.object({
  csvPath: z.string(),
  outputPath: z.string(),
  title: z.string()
});

export type GenerateInfographicInput = z.infer<typeof generateInfographicInputSchema>;

export const generateInfographicJsonSchema = {
  type: "object",
  required: ["csvPath", "outputPath", "title"],
  properties: {
    csvPath: { type: "string", description: "Ścieżka do pliku CSV z danymi" },
    outputPath: { type: "string", description: "Miejsce zapisu wygenerowanej infografiki (HTML)" },
    title: { type: "string", description: "Tytuł infografiki" }
  }
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateInfographicTool(input: GenerateInfographicInput): {
  success: boolean;
  outputPath: string;
  totalResponses: number;
} {
  const csvSafePath = resolve(process.cwd(), input.csvPath);
  const outputSafePath = resolve(process.cwd(), input.outputPath);

  if (!csvSafePath.startsWith(process.cwd()) || !outputSafePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony");
  }

  const { headers, rows } = parseCsvTool({ path: input.csvPath });

  const headerSummaries = headers.map((header) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const rawValue = row[header] ?? "Brak danych";
      const normalized = rawValue.trim().length > 0 ? rawValue : "Brak danych";
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    const topEntries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    return {
      header,
      topEntries,
      uniqueValues: counts.size
    };
  });

  const infographicHtml = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f8; color: #2c3e50; margin: 0; padding: 40px; }
      h1 { text-align: center; margin-bottom: 10px; }
      .summary { text-align: center; margin-bottom: 30px; font-size: 1.1rem; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
      .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
      .card h2 { font-size: 1.1rem; margin-top: 0; }
      .bar { display: flex; align-items: center; margin: 8px 0; }
      .bar span { flex: 0 0 50px; font-weight: bold; }
      .bar div { flex: 1; height: 10px; background: #ecf0f1; border-radius: 5px; overflow: hidden; margin-left: 10px; position: relative; }
      .bar div::after { content: ""; position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #3498db, #8e44ad); width: var(--width, 0%); }
      .no-data { font-style: italic; color: #7f8c8d; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(input.title)}</h1>
    <div class="summary">Łączna liczba odpowiedzi: ${rows.length}</div>
    <div class="grid">
      ${headerSummaries
        .map((summary) => {
          if (summary.topEntries.length === 0) {
            return `<div class="card"><h2>${escapeHtml(summary.header)}</h2><p class="no-data">Brak danych</p></div>`;
          }
          const maxCount = summary.topEntries[0]?.count ?? 1;
          const bars = summary.topEntries
            .map((entry) => {
              const percentage = Math.round((entry.count / maxCount) * 100);
              return `<div class="bar"><span>${entry.count}</span><div style="--width: ${percentage}%"></div><p style="margin-left:10px;">${escapeHtml(entry.value)}</p></div>`;
            })
            .join("");
          return `<div class="card"><h2>${escapeHtml(summary.header)}</h2>${bars}<p class="no-data">Łącznie odpowiedzi: ${rows.length}, unikalnych wartości: ${summary.uniqueValues}</p></div>`;
        })
        .join("")}
    </div>
  </body>
</html>`;

  try {
    mkdirSync(dirname(outputSafePath), { recursive: true });
    writeFileSync(outputSafePath, infographicHtml, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd zapisu infografiki: ${message}`);
  }

  return {
    success: true,
    outputPath: input.outputPath,
    totalResponses: rows.length
  };
}

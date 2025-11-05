import { z } from "zod";

import { parseCsvTool } from "./parse_csv.js";
import { writeFileTool } from "./write_file.js";

export const generateInfographicInputSchema = z.object({
  csvPath: z.string(),
  outputPath: z.string().default("output/infographic.html"),
  title: z.string().default("Infografika")
});

export type GenerateInfographicInput = z.infer<typeof generateInfographicInputSchema>;

export const generateInfographicJsonSchema = {
  type: "object",
  required: ["csvPath"],
  properties: {
    csvPath: { type: "string", description: "Ścieżka do pliku CSV" },
    outputPath: {
      type: "string",
      description: "Ścieżka zapisu HTML",
      default: "output/infographic.html"
    },
    title: {
      type: "string",
      description: "Tytuł infografiki",
      default: "Infografika"
    }
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

export function generateInfographicTool(
  input: GenerateInfographicInput
): { success: true; outputPath: string; rowsProcessed: number } {
  try {
    const { rows, headers } = parseCsvTool({ path: input.csvPath });

    const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
    const headerList = headers.map((header) => escapeHtml(header)).join(", ");
    const bodyRows = rows
      .slice(0, 100)
      .map((row) => {
        const cells = headers
          .map((header) => `<td>${escapeHtml(row[header] ?? "-")}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background: #f0f0f0;
      }

      h1 {
        color: #2c3e50;
        text-align: center;
      }

      .stats {
        background: white;
        padding: 20px;
        margin: 20px 0;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }

      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      th {
        background: #3498db;
        color: white;
      }

      tr:hover {
        background: #f5f5f5;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(input.title)}</h1>
    <section class="stats">
      <h2>Statystyki</h2>
      <p>Liczba rekordów: ${rows.length}</p>
      <p>Kolumny: ${headerList}</p>
    </section>
    <section>
      <h2>Dane</h2>
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </section>
  </body>
</html>`;

    const result = writeFileTool({ path: input.outputPath, content: html });
    return {
      success: true,
      outputPath: result.path,
      rowsProcessed: rows.length
    };
  } catch (error) {
    throw new Error(
      `❌ Błąd generowania infografiki: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

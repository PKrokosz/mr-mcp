import { readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

export const readFileInputSchema = z.object({
  path: z.string()
});

export type ReadFileInput = z.infer<typeof readFileInputSchema>;

export const readFileJsonSchema = {
  type: "object",
  required: ["path"],
  properties: {
    path: {
      type: "string",
      description: "Ścieżka do pliku (relatywna do katalogu projektu)"
    }
  }
} as const;

export function readFileTool(input: ReadFileInput): { content: string } {
  const safePath = resolve(process.cwd(), input.path);
  if (!safePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony: plik poza katalogiem projektu");
  }

  try {
    const content = readFileSync(safePath, "utf-8");
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd odczytu pliku: ${message}`);
  }
}

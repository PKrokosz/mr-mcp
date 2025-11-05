import { readFileSync } from "fs";
import { relative, resolve } from "path";
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

const projectRoot = process.cwd();

function resolveProjectPath(requestedPath: string) {
  const absolutePath = resolve(projectRoot, requestedPath);
  const relativePath = relative(projectRoot, absolutePath);
  if (relativePath.startsWith("..")) {
    throw new Error("❌ Dostęp zabroniony: plik poza katalogiem projektu");
  }
  return absolutePath;
}

export function readFileTool(input: ReadFileInput): { content: string } {
  const safePath = resolveProjectPath(input.path);

  try {
    const content = readFileSync(safePath, "utf-8");
    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd odczytu pliku: ${message}`);
  }
}

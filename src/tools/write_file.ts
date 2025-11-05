import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { z } from "zod";

export const writeFileInputSchema = z.object({
  path: z.string(),
  content: z.string()
});

export type WriteFileInput = z.infer<typeof writeFileInputSchema>;

export const writeFileJsonSchema = {
  type: "object",
  required: ["path", "content"],
  properties: {
    path: { type: "string", description: "Ścieżka zapisu pliku" },
    content: { type: "string", description: "Zawartość do zapisania" }
  }
} as const;

export function writeFileTool(input: WriteFileInput): { success: boolean; path: string } {
  const safePath = resolve(process.cwd(), input.path);
  if (!safePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony");
  }

  try {
    mkdirSync(dirname(safePath), { recursive: true });
    writeFileSync(safePath, input.content, "utf-8");
    return { success: true, path: input.path };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd zapisu: ${message}`);
  }
}

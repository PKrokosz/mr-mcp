import { readdirSync } from "fs";
import { relative, resolve } from "path";
import { z } from "zod";

export const listFilesInputSchema = z.object({
  directory: z.string().default(".")
});

export type ListFilesInput = z.infer<typeof listFilesInputSchema>;

export const listFilesJsonSchema = {
  type: "object",
  properties: {
    directory: {
      type: "string",
      description: "Katalog do listowania",
      default: "."
    }
  }
} as const;

const projectRoot = process.cwd();

function resolveProjectDirectory(requestedDirectory: string) {
  const absolutePath = resolve(projectRoot, requestedDirectory);
  const relativePath = relative(projectRoot, absolutePath);
  if (relativePath.startsWith("..")) {
    throw new Error("❌ Dostęp zabroniony: katalog poza projektem");
  }
  return absolutePath;
}

export function listFilesTool(input: ListFilesInput): { files: string[] } {
  const safePath = resolveProjectDirectory(input.directory);

  try {
    const files = readdirSync(safePath);
    return { files };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd listowania: ${message}`);
  }
}

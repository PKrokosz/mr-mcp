import { readdirSync } from "fs";
import { resolve } from "path";
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

export function listFilesTool(input: ListFilesInput): { files: string[] } {
  const safePath = resolve(process.cwd(), input.directory);
  if (!safePath.startsWith(process.cwd())) {
    throw new Error("❌ Dostęp zabroniony");
  }

  try {
    const files = readdirSync(safePath);
    return { files };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`❌ Błąd listowania: ${message}`);
  }
}

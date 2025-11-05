import { z } from "zod";

import { analyzeDataInputSchema, analyzeDataJsonSchema, analyzeDataTool } from "./analyze_data.js";
import {
  generateInfographicInputSchema,
  generateInfographicJsonSchema,
  generateInfographicTool
} from "./generate_infographic.js";
import { listFilesInputSchema, listFilesJsonSchema, listFilesTool } from "./list_files.js";
import { parseCsvInputSchema, parseCsvJsonSchema, parseCsvTool } from "./parse_csv.js";
import { pingInputSchema, pingJsonSchema, pingTool } from "./ping.js";
import { readFileInputSchema, readFileJsonSchema, readFileTool } from "./read_file.js";
import { writeFileInputSchema, writeFileJsonSchema, writeFileTool } from "./write_file.js";

type AnyZodSchema = z.ZodTypeAny;

export interface ToolDefinition<TInput extends AnyZodSchema = AnyZodSchema> {
  name: string;
  description: string;
  inputSchema: TInput;
  manifest: {
    name: string;
    description: string;
    input_schema: unknown;
  };
  handler: (input: z.infer<TInput>) => unknown;
}

const definitions = [
  {
    name: "ping",
    description: "Odbija wiadomość i dodaje znacznik czasu.",
    inputSchema: pingInputSchema,
    manifest: {
      name: "ping",
      description: "Odbija wiadomość i dodaje znacznik czasu.",
      input_schema: pingJsonSchema
    },
    handler: pingTool
  },
  {
    name: "read_file",
    description: "Odczytuje zawartość pliku tekstowego.",
    inputSchema: readFileInputSchema,
    manifest: {
      name: "read_file",
      description: "Odczytuje zawartość pliku tekstowego.",
      input_schema: readFileJsonSchema
    },
    handler: readFileTool
  },
  {
    name: "write_file",
    description: "Zapisuje tekst do pliku.",
    inputSchema: writeFileInputSchema,
    manifest: {
      name: "write_file",
      description: "Zapisuje tekst do pliku.",
      input_schema: writeFileJsonSchema
    },
    handler: writeFileTool
  },
  {
    name: "list_files",
    description: "Listuje pliki w katalogu.",
    inputSchema: listFilesInputSchema,
    manifest: {
      name: "list_files",
      description: "Listuje pliki w katalogu.",
      input_schema: listFilesJsonSchema
    },
    handler: listFilesTool
  },
  {
    name: "parse_csv",
    description: "Parsuje CSV i zwraca dane jako JSON.",
    inputSchema: parseCsvInputSchema,
    manifest: {
      name: "parse_csv",
      description: "Parsuje CSV i zwraca dane jako JSON.",
      input_schema: parseCsvJsonSchema
    },
    handler: parseCsvTool
  },
  {
    name: "analyze_data",
    description: "Analizuje dane CSV i zwraca statystyki.",
    inputSchema: analyzeDataInputSchema,
    manifest: {
      name: "analyze_data",
      description: "Analizuje dane CSV i zwraca statystyki.",
      input_schema: analyzeDataJsonSchema
    },
    handler: analyzeDataTool
  },
  {
    name: "generate_infographic",
    description: "Generuje infografikę HTML z danych CSV.",
    inputSchema: generateInfographicInputSchema,
    manifest: {
      name: "generate_infographic",
      description: "Generuje infografikę HTML z danych CSV.",
      input_schema: generateInfographicJsonSchema
    },
    handler: generateInfographicTool
  }
] as const satisfies readonly ToolDefinition[];

type Definition = (typeof definitions)[number];

export function getToolByName(name: string): Definition | undefined {
  return definitions.find((tool) => tool.name === name);
}

export function listToolManifests() {
  return definitions.map((tool) => tool.manifest);
}

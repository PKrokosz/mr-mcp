import { z } from "zod";

import { analyzeDataInputSchema, analyzeDataJsonSchema, analyzeDataTool } from "./analyze_data.js";
import { generateInfographicInputSchema, generateInfographicJsonSchema, generateInfographicTool } from "./generate_infographic.js";
import { listFilesInputSchema, listFilesJsonSchema, listFilesTool } from "./list_files.js";
import { parseCsvInputSchema, parseCsvJsonSchema, parseCsvTool } from "./parse_csv.js";
import { pingInputSchema, pingJsonSchema, pingTool } from "./ping.js";
import { readFileInputSchema, readFileJsonSchema, readFileTool } from "./read_file.js";
import { writeFileInputSchema, writeFileJsonSchema, writeFileTool } from "./write_file.js";

export interface ToolDefinition<TInput extends z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInput;
  manifest: {
    name: string;
    description: string;
    input_schema: unknown;
  };
  handler: (input: z.infer<TInput>) => Promise<unknown> | unknown;
}

const pingDefinition: ToolDefinition<typeof pingInputSchema> = {
  name: "ping",
  description: "Odbija wiadomość i dodaje znacznik czasu.",
  inputSchema: pingInputSchema,
  manifest: {
    name: "ping",
    description: "Odbija wiadomość i dodaje znacznik czasu.",
    input_schema: pingJsonSchema
  },
  handler: pingTool
};

const readFileDefinition: ToolDefinition<typeof readFileInputSchema> = {
  name: "read_file",
  description: "Odczytuje zawartość pliku tekstowego.",
  inputSchema: readFileInputSchema,
  manifest: {
    name: "read_file",
    description: "Odczytuje zawartość pliku.",
    input_schema: readFileJsonSchema
  },
  handler: readFileTool
};

const writeFileDefinition: ToolDefinition<typeof writeFileInputSchema> = {
  name: "write_file",
  description: "Zapisuje dane do pliku.",
  inputSchema: writeFileInputSchema,
  manifest: {
    name: "write_file",
    description: "Zapisuje dane do wskazanego pliku.",
    input_schema: writeFileJsonSchema
  },
  handler: writeFileTool
};

const listFilesDefinition: ToolDefinition<typeof listFilesInputSchema> = {
  name: "list_files",
  description: "Listuje pliki w katalogu.",
  inputSchema: listFilesInputSchema,
  manifest: {
    name: "list_files",
    description: "Listuje pliki w katalogu.",
    input_schema: listFilesJsonSchema
  },
  handler: listFilesTool
};

const parseCsvDefinition: ToolDefinition<typeof parseCsvInputSchema> = {
  name: "parse_csv",
  description: "Parsuje plik CSV do postaci JSON.",
  inputSchema: parseCsvInputSchema,
  manifest: {
    name: "parse_csv",
    description: "Parsuje plik CSV i zwraca dane.",
    input_schema: parseCsvJsonSchema
  },
  handler: parseCsvTool
};

const analyzeDataDefinition: ToolDefinition<typeof analyzeDataInputSchema> = {
  name: "analyze_data",
  description: "Analizuje kolumnę z pliku CSV i zwraca statystyki.",
  inputSchema: analyzeDataInputSchema,
  manifest: {
    name: "analyze_data",
    description: "Analizuje kolumnę CSV.",
    input_schema: analyzeDataJsonSchema
  },
  handler: analyzeDataTool
};

const generateInfographicDefinition: ToolDefinition<
  typeof generateInfographicInputSchema
> = {
  name: "generate_infographic",
  description: "Generuje infografikę HTML na podstawie danych CSV.",
  inputSchema: generateInfographicInputSchema,
  manifest: {
    name: "generate_infographic",
    description: "Generuje infografikę HTML z danych CSV.",
    input_schema: generateInfographicJsonSchema
  },
  handler: generateInfographicTool
};

const definitions = [
  pingDefinition,
  readFileDefinition,
  writeFileDefinition,
  listFilesDefinition,
  parseCsvDefinition,
  analyzeDataDefinition,
  generateInfographicDefinition
] as const;

export function getToolByName(name: string) {
  return definitions.find((tool) => tool.name === name);
}

export function listToolManifests() {
  return definitions.map((tool) => tool.manifest);
}

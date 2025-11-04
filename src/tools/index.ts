import { z } from "zod";

import { pingInputSchema, pingJsonSchema, pingTool } from "./ping.js";

export interface ToolDefinition<TInput extends z.ZodTypeAny> {
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

const definitions = [pingDefinition] as const;

export function getToolByName(name: string) {
  return definitions.find((tool) => tool.name === name);
}

export function listToolManifests() {
  return definitions.map((tool) => tool.manifest);
}

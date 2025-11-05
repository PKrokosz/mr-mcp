import Fastify from "fastify";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

import { getToolByName, listToolManifests } from "./tools/index.js";
import {
  generateInfographicInputSchema,
  generateInfographicTool
} from "./tools/generate_infographic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "manifest.json"), "utf-8")
);

const toolUseSchema = z.object({
  type: z.literal("tool_use"),
  tool: z.string({
    required_error: "tool is required"
  }),
  input: z.unknown()
});

const toolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool: z.string({
    required_error: "tool is required"
  }),
  output: z.unknown()
});

const legacyToolCallSchema = z.object({
  tool: z.string({
    required_error: "tool is required"
  }),
  input: z.unknown()
});

const toolCallSchema = z.union([toolUseSchema, toolResultSchema, legacyToolCallSchema]);

type ToolCallPayload = z.infer<typeof toolCallSchema>;
type ToolUsePayload = z.infer<typeof toolUseSchema>;
type ToolResultPayload = z.infer<typeof toolResultSchema>;
type LegacyToolPayload = z.infer<typeof legacyToolCallSchema>;

function isToolResultPayload(payload: ToolCallPayload): payload is ToolResultPayload {
  return (payload as Partial<ToolResultPayload>).type === "tool_result";
}

function isToolUsePayload(payload: ToolCallPayload): payload is ToolUsePayload {
  return (payload as Partial<ToolUsePayload>).type === "tool_use";
}

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/.well-known/mcp/manifest", async () => ({
    ...manifest,
    tools: listToolManifests()
  }));

  // Serve static GUI
  app.get("/", async (_request, reply) => {
    const html = readFileSync(join(__dirname, "public/index.html"), "utf-8");
    reply.type("text/html").send(html);
  });

  app.post("/infographics", async (request, reply) => {
    const payload = generateInfographicInputSchema.parse(request.body);
    const output = generateInfographicTool(payload);

    return reply.status(201).send({
      type: "tool_result",
      tool: "generate_infographic",
      output
    });
  });

  app.post("/tools/call", async (request, reply) => {
    const parsedBody = toolCallSchema.parse(request.body);

    if (isToolResultPayload(parsedBody)) {
      return reply.status(200).send({
        type: "tool_result_ack",
        tool: parsedBody.tool,
        received: true
      });
    }

    const { tool, input } = isToolUsePayload(parsedBody)
      ? parsedBody
      : (parsedBody as LegacyToolPayload);
    const definition = getToolByName(tool);

    if (!definition) {
      return reply.status(404).send({
        error: `Unknown tool: ${tool}`
      });
    }

    try {
      const parsedInput = (definition.inputSchema as z.ZodTypeAny).parse(input);
      const output = await (definition.handler as (payload: unknown) => unknown)(
        parsedInput
      );
      return reply.status(200).send({
        type: "tool_result",
        tool: definition.name,
        output
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid input",
          details: error.errors
        });
      }
      throw error;
    }
  });

  return app;
}

const executedDirectly = (() => {
  const entryUrl = process.argv[1]
    ? new URL(`file://${process.argv[1]}`).href
    : undefined;
  return entryUrl === import.meta.url;
})();

if (executedDirectly) {
  const server = buildServer();
  const port = Number.parseInt(process.env.PORT ?? "8765", 10);
  server
    .listen({ port, host: "0.0.0.0" })
    .then(() => {
      server.log.info(`MCP server listening on http://0.0.0.0:${port}`);
    })
    .catch((error) => {
      server.log.error(error, "Failed to start server");
      process.exitCode = 1;
    });
}

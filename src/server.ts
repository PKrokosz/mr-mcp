import Fastify from "fastify";
import manifest from "../manifest.json" assert { type: "json" };
import { z } from "zod";

import { getToolByName, listToolManifests } from "./tools/index.js";

const toolCallSchema = z.object({
  tool: z.string({
    required_error: "tool is required"
  }),
  input: z.unknown()
});

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/.well-known/mcp/manifest", async () => ({
    ...manifest,
    tools: listToolManifests()
  }));

  app.post("/tools/call", async (request, reply) => {
    const { tool, input } = toolCallSchema.parse(request.body);
    const definition = getToolByName(tool);

    if (!definition) {
      return reply.status(404).send({
        error: `Unknown tool: ${tool}`
      });
    }

    try {
      const parsedInput = definition.inputSchema.parse(input);
      const output = definition.handler(parsedInput);
      return reply.status(200).send({
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

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

const server = buildServer();

beforeAll(async () => {
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

describe("MCP server", () => {
  it("returns healthy status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/healthz"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("exposes manifest with ping tool", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/.well-known/mcp/manifest"
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.name).toBe("mr-mcp");
    const toolNames = payload.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("ping");
  });

  it("executes ping tool", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        tool: "ping",
        input: {
          message: "hello"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.tool).toBe("ping");
    expect(payload.output.echo).toBe("hello");
    expect(new Date(payload.output.ts).toString()).not.toBe("Invalid Date");
  });

  it("rejects invalid payloads", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        tool: "ping",
        input: {}
      }
    });

    expect(response.statusCode).toBe(400);
    const payload = response.json();
    expect(payload.error).toBe("Invalid input");
  });
});

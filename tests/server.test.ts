import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

const server = buildServer();
const outputFile = join(process.cwd(), "output/test-infographic.html");
const reportFile = join(process.cwd(), "output/report.txt");

beforeAll(async () => {
  await server.ready();
});

afterEach(() => {
  rmSync(outputFile, { force: true });
  rmSync(reportFile, { force: true });
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
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "ping",
        "read_file",
        "write_file",
        "list_files",
        "parse_csv",
        "analyze_data",
        "generate_infographic"
      ])
    );
  });

  it("executes ping tool", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "ping",
        input: {
          message: "hello"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.type).toBe("tool_result");
    expect(payload.tool).toBe("ping");
    expect(payload.output.echo).toBe("hello");
    expect(new Date(payload.output.ts).toString()).not.toBe("Invalid Date");
  });

  it("rejects invalid payloads", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "ping",
        input: {}
      }
    });

    expect(response.statusCode).toBe(400);
    const payload = response.json();
    expect(payload.error).toBe("Invalid input");
  });

  it("acknowledges tool_result payloads", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_result",
        tool: "ping",
        output: {
          echo: "hello"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      type: "tool_result_ack",
      tool: "ping",
      received: true
    });
  });

  it("reads CSV content with read_file tool", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "read_file",
        input: {
          path: "data/responses.csv"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().output.content).toContain("Alice");
  });

  it("lists files from directory", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "list_files",
        input: {
          directory: "data"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().output.files).toContain("responses.csv");
  });

  it("parses CSV and returns rows", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "parse_csv",
        input: {
          path: "data/responses.csv"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.output.headers).toEqual(["Name", "Age", "Choice"]);
    expect(payload.output.rows).toHaveLength(5);
  });

  it("analyzes CSV column", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "analyze_data",
        input: {
          path: "data/responses.csv",
          column: "Age"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.output.count).toBe(5);
    expect(payload.output.numericCount).toBe(5);
    expect(payload.output.min).toBeCloseTo(25);
    expect(payload.output.max).toBeCloseTo(35);
    expect(payload.output.totalResponses).toBeUndefined();
  });

  it("writes data to file", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        type: "tool_use",
        tool: "write_file",
        input: {
          path: "output/report.txt",
          content: "Treść raportu"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().output.success).toBe(true);
    expect(existsSync(reportFile)).toBe(true);
    expect(readFileSync(reportFile, "utf-8")).toBe("Treść raportu");
  });

  it("generates infographic via endpoint", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/infographics",
      payload: {
        csvPath: "data/responses.csv",
        outputPath: "output/test-infographic.html",
        title: "Wyniki ankiety 2024"
      }
    });

    expect(response.statusCode).toBe(201);
    const payload = response.json();
    expect(payload.tool).toBe("generate_infographic");
    expect(payload.output.success).toBe(true);
    expect(existsSync(outputFile)).toBe(true);
    const content = readFileSync(outputFile, "utf-8");
    expect(content).toContain("Wyniki ankiety 2024");
    expect(content).toContain("Łączna liczba odpowiedzi: 5");
  });
});

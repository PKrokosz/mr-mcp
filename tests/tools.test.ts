import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";

import { buildServer } from "../src/server.js";

const server = buildServer();

beforeAll(async () => {
  mkdirSync("data", { recursive: true });
  writeFileSync("data/test.csv", "Name,Age\nAlice,30\nBob,25", "utf-8");
  await server.ready();
});

afterAll(async () => {
  rmSync("data/test.csv", { force: true });
  rmSync("output/test.html", { force: true });
  await server.close();
});

describe("File tools", () => {
  it("reads file", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: { tool: "read_file", input: { path: "data/test.csv" } }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().output.content).toContain("Alice");
  });

  it("parses CSV", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: { tool: "parse_csv", input: { path: "data/test.csv" } }
    });

    expect(response.statusCode).toBe(200);
    const { rows, headers } = response.json().output;
    expect(headers).toEqual(["Name", "Age"]);
    expect(rows).toHaveLength(2);
  });

  it("generates infographic", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/tools/call",
      payload: {
        tool: "generate_infographic",
        input: {
          csvPath: "data/test.csv",
          outputPath: "output/test.html",
          title: "Test Infographic"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().output.success).toBe(true);
  });
});

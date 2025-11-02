import { assertEquals, assertExists } from "@std/assert";
import { createEdgeMCPServer } from "./mod.ts";

Deno.test("should create server with health endpoint", async () => {
  const { app } = createEdgeMCPServer({
    name: "test-server",
    version: "1.0.0",
  });

  const req = new Request("http://localhost/health");
  const res = await app.fetch(req);

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data, { status: "ok" });
});

Deno.test("should handle MCP endpoint", async () => {
  const { app, server } = createEdgeMCPServer({
    name: "test-server",
    version: "1.0.0",
  });

  // Add a simple tool for testing
  server.tool("test_tool", {
    description: "A test tool",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: () => ({
      content: [{ type: "text", text: "test" }],
    }),
  });

  const req = new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });

  const res = await app.fetch(req);
  assertEquals(res.status, 200);

  const data = await res.json() as { jsonrpc: string; id: number; result: unknown };
  assertEquals(data.jsonrpc, "2.0");
  assertEquals(data.id, 1);
  assertExists(data.result);
});

Deno.test("should apply CORS headers", async () => {
  const { app } = createEdgeMCPServer({
    name: "test-server",
    corsOrigins: "https://example.com",
  });

  const req = new Request("http://localhost/health", {
    headers: {
      Origin: "https://example.com",
    },
  });
  const res = await app.fetch(req);

  const corsHeader = res.headers.get("access-control-allow-origin");
  assertExists(corsHeader);
  assertEquals(corsHeader?.includes("example.com"), true);
});

Deno.test("should disable logging when configured", async () => {
  const { app } = createEdgeMCPServer({
    name: "test-server",
    enableLogging: false,
  });

  const req = new Request("http://localhost/health");
  const res = await app.fetch(req);

  assertEquals(res.status, 200);
});

Deno.test("should use default version when not specified", () => {
  const { server } = createEdgeMCPServer({
    name: "test-server",
  });

  // The server should be created successfully
  assertExists(server);
});

Deno.test("should support array of CORS origins", async () => {
  const { app } = createEdgeMCPServer({
    name: "test-server",
    corsOrigins: ["https://example.com", "https://example.org"],
  });

  const req = new Request("http://localhost/health", {
    headers: {
      Origin: "https://example.com",
    },
  });
  const res = await app.fetch(req);

  assertEquals(res.status, 200);
});

Deno.test("should return serve function that can be used with Deno.serve", async () => {
  const { serve } = createEdgeMCPServer({
    name: "test-server",
  });

  const handler = serve();
  const req = new Request("http://localhost/health");
  const res = await handler(req);

  assertEquals(res.status, 200);
});

Deno.test("should mount under basePath when provided", async () => {
  const { serve, server } = createEdgeMCPServer({
    name: "test-server",
    basePath: "/my-func",
  });

  // add a simple tool so /mcp works too
  server.tool("ping", {
    description: "Ping tool",
    handler: () => ({ content: [{ type: "text", text: "pong" }] }),
  });

  const handler = serve();

  // Health should be available under the base path
  const resHealth = await handler(new Request("http://localhost/my-func/health"));
  assertEquals(resHealth.status, 200);

  // MCP should be available under the base path
  const resMcp = await handler(
    new Request("http://localhost/my-func/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }),
  );
  assertEquals(resMcp.status, 200);
});

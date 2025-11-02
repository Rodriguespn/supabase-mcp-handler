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

Deno.test("should respond on root path with server info", async () => {
  const { app } = createEdgeMCPServer({
    name: "root-test",
    version: "9.9.9",
  });

  const res = await app.fetch(new Request("http://localhost/"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, "root-test");
  assertEquals(body.version, "9.9.9");
  assertEquals(body.status, "ok");
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

Deno.test({
  name: "E2E: simulate Supabase Edge Function with /, /health, /mcp",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { serve, server } = createEdgeMCPServer({
      name: "edge-func-server",
      basePath: "/edge-func",
    });

    // Add a simple tool to ensure /mcp works
    server.tool("echo", {
      description: "Echo tool",
      inputSchema: { type: "object", properties: { msg: { type: "string" } } },
      handler: ({ msg }: { msg?: string }) => ({
        content: [{ type: "text", text: msg ?? "ok" }],
      }),
    });

    const controller = new AbortController();
    let portResolve: (n: number) => void;
    const portPromise = new Promise<number>((resolve) => (portResolve = resolve));

    // Start an HTTP server bound to a random port
    const handler = serve();
    const serverInstance = Deno.serve(
      { port: 0, hostname: "127.0.0.1", signal: controller.signal, onListen: ({ port }) => portResolve(port) },
      handler,
    );

    const port = await portPromise;
    const baseUrl = `http://127.0.0.1:${port}`;

    // Root under basePath
  const resRoot = await fetch(`${baseUrl}/edge-func`);
    assertEquals(resRoot.status, 200);
    const rootJson = await resRoot.json() as { status: string };
    assertEquals(rootJson.status, "ok");

    // Health under basePath
    const resHealth = await fetch(`${baseUrl}/edge-func/health`);
    assertEquals(resHealth.status, 200);
    const health = await resHealth.json();
    assertEquals(health, { status: "ok" });

    // MCP under basePath
    const resMcp = await fetch(`${baseUrl}/edge-func/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    assertEquals(resMcp.status, 200);
    const mcpJson = await resMcp.json() as { jsonrpc: string; id: number; result: unknown };
    assertEquals(mcpJson.jsonrpc, "2.0");
    assertEquals(mcpJson.id, 1);

    // shutdown server
    controller.abort();
    await serverInstance.finished;
  },
});

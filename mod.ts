// Main module for supabase-mcp-handler
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { Hono } from "hono";

/**
 * Configuration options for creating an Edge MCP Server
 */
export interface EdgeMCPConfig {
  /** Name of your MCP server */
  name: string;
  /** Server version (defaults to "1.0.0") */
  version?: string;
  /** CORS origins - string or array of strings (defaults to "*") */
  corsOrigins?: string | string[];
  /** Enable request logging (defaults to true) */
  enableLogging?: boolean;
  /** Schema adapter for validating inputs (e.g., Zod, Valibot) */
  schemaAdapter?: (schema: unknown) => unknown;
  /** Optional base path to mount the server under (e.g. "/my-function") */
  basePath?: string;
}

/**
 * Return type for createEdgeMCPServer
 */
export interface EdgeMCPServerResult {
  /** mcp-lite McpServer instance - use this to add tools, resources, and prompts */
  server: McpServer;
  /** Hono app instance - for advanced customization */
  app: Hono;
  /** Ready-to-use request handler for Deno.serve() */
  serve: () => (req: Request, info?: Deno.ServeHandlerInfo) => Response | Promise<Response>;
}

/**
 * Creates a configured MCP server ready for deployment to Supabase Edge Functions.
 * 
 * @example
 * ```ts
 * import { createEdgeMCPServer } from "@supabase/mcp-handler";
 * import { z } from "npm:zod";
 * 
 * const { server, serve } = createEdgeMCPServer({
 *   name: "my-mcp-server",
 *   corsOrigins: ["https://myapp.com"],
 *   schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType)
 * });
 * 
 * server.tool("get_weather", {
 *   description: "Get weather information",
 *   inputSchema: z.object({ city: z.string() }),
 *   handler: async ({ city }) => ({
 *     content: [{ type: "text", text: `Weather in ${city}: 72°F` }]
 *   })
 * });
 * 
 * Deno.serve(serve());
 * ```
 */
export function createEdgeMCPServer(config: EdgeMCPConfig): EdgeMCPServerResult {
  // Create mcp-lite instance
  const server = new McpServer({
    name: config.name,
    version: config.version || "1.0.0",
    schemaAdapter: config.schemaAdapter,
  });

  // Create inner Hono app that implements the endpoints
  const app = new Hono();

  // Add CORS middleware
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin") || "*";
    const allowedOrigins = Array.isArray(config.corsOrigins)
      ? config.corsOrigins
      : config.corsOrigins
      ? [config.corsOrigins]
      : ["*"];

    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (c.req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    await next();
  });

  // Add logging middleware
  if (config.enableLogging !== false) {
    app.use("*", async (c, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
    });
  }

  // Health check endpoint
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Root endpoint with basic server info
  app.get("/", (c) =>
    c.json({
      name: config.name,
      version: config.version || "1.0.0",
      status: "ok",
      endpoints: {
        health: "./health",
        mcp: "./mcp",
      },
    }),
  );

  // Create StreamableHttpTransport and bind the server
  const transport = new StreamableHttpTransport();
  const mcpHandler = transport.bind(server);

  // Mount MCP server handler
  app.all("/mcp", async (c) => {
    const request = c.req.raw;
    const response = await mcpHandler(request);
    return response;
  });

  // If a basePath is provided, mount the inner app under that path on a root app
  if (config.basePath && config.basePath.trim() !== "") {
    // Normalize base path to ensure it starts with a single leading slash and no trailing slash
    let base = config.basePath.trim();
    if (!base.startsWith("/")) base = `/${base}`;
    if (base !== "/" && base.endsWith("/")) base = base.slice(0, -1);

    const root = new Hono();
    root.route(base, app);

    return {
      server,
      app, // inner app (customize routes/middleware here)
      serve: () => root.fetch, // serve the mounted app
    };
  }

  // Default: serve the inner app at root
  return {
    server,
    app,
    serve: () => app.fetch,
  };
}

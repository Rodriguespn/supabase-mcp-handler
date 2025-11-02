import { createEdgeMCPServer } from "./mod.ts";
import { z } from "npm:zod@^3.23.8";
import { zodToJsonSchema } from "npm:zod-to-json-schema@^3.23.0";

// Create the MCP server
const { server, serve } = createEdgeMCPServer({
  name: "example-mcp-server",
  basePath: "/my-edge-func",
  version: "1.0.0",
  corsOrigins: "*",
  enableLogging: true,
  schemaAdapter: (schema) => zodToJsonSchema(schema as z.ZodType),
});

// Add a simple echo tool
server.tool("echo", {
  description: "Echoes back the provided message",
  inputSchema: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  handler: ({ message }) => ({
    content: [
      {
        type: "text",
        text: `Echo: ${message}`,
      },
    ],
  }),
});

// Add a weather tool (mock example)
server.tool("get_weather", {
  description: "Get weather information for a city",
  inputSchema: z.object({
    city: z.string().describe("The city to get weather for"),
  }),
  handler: ({ city }) => ({
    content: [
      {
        type: "text",
        text: `Weather in ${city}: 72°F, Sunny`,
      },
    ],
    structuredContent: {
      temperature: 72,
      condition: "sunny",
      city,
    },
  }),
});

// Add a resource
server.resource(
  "config://settings",
  {
    name: "Application Settings",
    description: "Server configuration settings",
    mimeType: "application/json",
  },
  (uri) => Promise.resolve({
    contents: [
      {
        uri: uri.href,
        type: "text",
        text: JSON.stringify({
          version: "1.0.0",
          env: "production",
        }),
        mimeType: "application/json",
      },
    ],
  })
);

// Serve the MCP server
console.log("🚀 MCP Server running on http://localhost:8000");
console.log("📊 Health check: http://localhost:8000/health");
console.log("🔧 MCP endpoint: http://localhost:8000/mcp");

Deno.serve({ port: 8000 }, serve());

# supabase-mcp-handler

Helper library for deploying MCP (Model Context Protocol) servers to Supabase Edge Functions running on Deno.

## Features

- 🚀 Minimal setup for MCP servers on Supabase Edge Functions
- 🔧 Direct access to mcp-lite - no abstraction layer
- 🌐 Built-in CORS support
- 📊 Health check endpoint
- 🪵 Optional logging middleware
- 🎯 Zero configuration MCP handler mounting

## Installation

```bash
npm install supabase-mcp-handler
```

## Usage

```typescript
import { createEdgeMCPServer } from "supabase-mcp-handler";

const { server, serve } = createEdgeMCPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  corsOrigins: ["https://myapp.com"],
  enableLogging: true, // default: true
});

// Use mcp-lite directly - full API access
server.tool({
  name: "get_weather",
  description: "Get weather information",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => {
    return { temperature: 72, condition: "sunny" };
  },
});

server.resource({
  uri: "weather://current",
  name: "Current Weather",
  mimeType: "application/json",
  load: async () => ({ temperature: 72 }),
});

// One-line deployment to Supabase Edge Functions
Deno.serve(serve());
```

## API

### `createEdgeMCPServer(config)`

Creates a configured MCP server ready for deployment.

#### Config Options

- `name` (required): Name of your MCP server
- `version` (optional): Server version, defaults to "1.0.0"
- `corsOrigins` (optional): CORS origins (string or array), defaults to "*"
- `enableLogging` (optional): Enable request logging, defaults to true

#### Returns

- `server`: mcp-lite MCPServer instance - use this to add tools, resources, and prompts
- `app`: Hono app instance - for advanced customization
- `serve()`: Ready-to-use request handler for Deno.serve()

## Endpoints

- `GET /health` - Health check endpoint returning `{ status: "ok" }`
- `POST /mcp` - MCP protocol endpoint

## Why This Approach?

- **Lowest maintenance burden**: No method proxying needed
- **Full flexibility**: Developers use mcp-lite directly
- **No version conflicts**: Works with any mcp-lite update
- **Value where it matters**: Handles Edge Function setup and serving

## License

MIT

## Author

Pedro Rodrigues

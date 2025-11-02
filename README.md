# supabase-mcp-handler

Helper library for deploying MCP (Model Context Protocol) servers to Supabase Edge Functions running on Deno.

## Features

- 🚀 Minimal setup for MCP servers on Supabase Edge Functions
- 🔧 Direct access to mcp-lite - no abstraction layer
- 🌐 Built-in CORS support
- 📊 Health check endpoint
- 🪵 Optional logging middleware
- 🧭 Base path mounting for Supabase routing

## Install (JSR)

```bash
deno add @rodriguespn/supabase-mcp-handler
```

Or import directly:

```ts
import { createEdgeMCPServer } from "jsr:@rodriguespn/supabase-mcp-handler@0.0.2";
```

## Usage

### Basic (root mounted)

```ts
import { createEdgeMCPServer } from "jsr:@rodriguespn/supabase-mcp-handler";

const { server, serve } = createEdgeMCPServer({
  name: "my-mcp-server",
  corsOrigins: ["https://myapp.com"],
});

// Use mcp-lite directly
server.tool("get_weather", {
  description: "Get weather information",
  inputSchema: { type: "object", properties: { city: { type: "string" } } },
  handler: ({ city }) => ({ content: [{ type: "text", text: `Weather in ${city}` }] }),
});

Deno.serve(serve());
```

### Supabase Edge Functions (mounted under function name)

When running locally, Supabase exposes functions at:

`http://127.0.0.1:54321/functions/v1/<function-name>`

To align Hono routing, mount all endpoints under the function name using `basePath`:

```ts
import { createEdgeMCPServer } from "jsr:@rodriguespn/supabase-mcp-handler";

const { server, serve } = createEdgeMCPServer({
  name: "my-mcp-server",
  basePath: "/my-mcp-server", // equivalent to: app.route('/my-mcp-server', mcpApp)
});

Deno.serve(serve());

// Endpoints will be available at:
// GET  /my-mcp-server/health
// POST /my-mcp-server/mcp
```

Notes:
- `basePath` is normalized (leading slash added, trailing slash removed)
- If `basePath` is omitted, endpoints are mounted at the root: `/health`, `/mcp`
- For local Supabase CLI, set `basePath` to your function name

### Advanced: Bring your own parent router

`createEdgeMCPServer` returns the inner Hono app as `app`. If you need a custom parent router, you can mount it yourself:

```ts
import { Hono } from "hono";
import { createEdgeMCPServer } from "jsr:@rodriguespn/supabase-mcp-handler";

const { app, server } = createEdgeMCPServer({ name: "my-mcp-server" });
const root = new Hono();
root.route("/my-mcp-server", app);

Deno.serve(root.fetch);
```

## API

### `createEdgeMCPServer(config)`

Creates a configured MCP server ready for deployment.

#### Config Options

- `name` (required): Name of your MCP server
- `version` (optional): Server version, defaults to "1.0.0"
- `corsOrigins` (optional): CORS origins (string or array), defaults to "*"
- `enableLogging` (optional): Enable request logging, defaults to true
- `basePath` (optional): Mount all endpoints under this path (e.g. "/my-func")
- `schemaAdapter` (optional): Provide a Standard Schema adapter (Zod, etc.)

#### Returns

- `server`: mcp-lite McpServer instance - add tools, resources, prompts
- `app`: inner Hono app - customize routes/middleware before serving
- `serve()`: Ready-to-use handler for `Deno.serve()`; returns a handler that mounts under `basePath` if provided

## Endpoints

- `GET /health` - Health check endpoint returning `{ status: "ok" }`
- `POST /mcp` - MCP protocol endpoint

Under a base path `"/my-func"`, these become:

- `GET /my-func/health`
- `POST /my-func/mcp`

## Why This Approach?

- **Lowest maintenance burden**: No method proxying needed
- **Full flexibility**: Developers use mcp-lite directly
- **No version conflicts**: Works with any mcp-lite update
- **Deno-native**: Built specifically for Supabase Edge Functions

## License

MIT

## Author

Pedro Rodrigues

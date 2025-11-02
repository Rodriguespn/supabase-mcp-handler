# Publishing to JSR

This package is designed to be published to JSR (JavaScript Registry) for use with Supabase Edge Functions.

## Pre-publish Checklist

- [x] All tests passing (`deno test --allow-net`)
- [x] Code formatted (`deno fmt`)
- [x] Code linted (`deno lint`)
- [x] Type checking passes (`deno check mod.ts`)
- [x] README.md complete with examples
- [x] LICENSE file included
- [x] Version set in deno.json

## Publishing Steps

1. **Create a JSR account** at https://jsr.io

2. **Link your GitHub repository** (JSR requires a GitHub repo for publishing)

3. **Publish the package:**
   ```bash
   deno publish
   ```

4. **Or publish with dry-run first:**
   ```bash
   deno publish --dry-run
   ```

## Package Name

The package will be available as:
```typescript
import { createEdgeMCPServer } from "jsr:@supabase/mcp-handler@0.0.1";
```

Note: The `@supabase` scope requires permission from the Supabase organization on JSR. If you don't have access, you can publish under your own username:

```json
{
  "name": "@yourusername/mcp-handler",
  "version": "0.0.1"
}
```

## Version Bumping

Update the version in `deno.json`:
```json
{
  "version": "0.0.2"
}
```

Then republish:
```bash
deno publish
```

## Testing Before Publishing

Always test the package locally before publishing:

```bash
deno task test
deno task check
deno task example
```

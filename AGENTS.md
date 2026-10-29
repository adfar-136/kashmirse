# Kashmir Se

## Code discovery

This project uses codebase-memory-mcp. Prefer its graph tools for code discovery in this order: search_graph, trace_path, get_code_snippet, query_graph, get_architecture. Fall back to rg for string literals, configuration, non-code files or insufficient graph results.

## Implementation

- Next.js App Router and TypeScript, with Feature-Sliced Design layers in src/views, src/widgets, src/features, src/entities and src/shared.
- Local MongoDB database: kashmir_se. Preserve unrelated databases and existing records.
- The approved visual reference is public/design-reference.png. Preserve its ivory/walnut/gold palette, serif typography, floral borders, image crops and proportions. Do not redesign without a user request.
- MongoDB is authoritative for prices, inventory, orders and accounts. Validate all mutations and enforce session/role/origin checks on the server.
- Payments and courier fulfilment are explicitly local/demo until real integrations are configured. Never claim real payment or shipping success from a demo status.
- Keep seed data honest and labelled. Never replace supplier verification with generated claims.
- Preserve existing orders; archive catalogue entries rather than deleting purchased products.

## Checks

Run npm test and npm run build for relevant changes. With the app and local MongoDB running, npm run test:integration checks commerce, permissions, stock concurrency and route rendering. Integration tests create and remove only their own records.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---
name: Vercel ESM & Supabase Best Practices
description: Guidelines for ensuring Node.js ESM compatibility on Vercel and robust Supabase connectivity.
---

# Vercel ESM & Supabase Best Practices

This skill provides mandatory guidelines for developing and deploying Node.js applications to Vercel when using ESM (`"type": "module"`) and Supabase.

## ESM Import Requirements
When the project is in ESM mode, you MUST follow these rules for relative imports:
1. **Always use extensions**: Every relative import must include the `.js` extension, even if the source file is `.ts`.
   - ❌ `import { routes } from "./routes";`
   - ✅ `import { routes } from "./routes.js";`
2. **Standard Libraries**: Built-in Node.js modules should use the `node:` prefix.
   - ✅ `import crypto from "node:crypto";`

## Supabase Connectivity on Vercel
Direct connections to Supabase usually fail on Vercel (ENOTFOUND or timeout) due to network constraints and connection limits.
1. **Use Transaction Pooler**: Always use the Supabase Transaction Pooler URL for the `DATABASE_URL` environment variable.
   - **Hostname format**: `aws-0-region.pooler.supabase.com`
   - **Port**: `6543`
2. **User Format**: The database user must follow the format `postgres.PROJECT_ID`.
3. **Environment Variables**: Never rely on a local `.env` file for production. Use `vercel env add` or the Vercel dashboard.

## Deployment Checklist
- [ ] Run `npm run build` locally to verify TypeScript compilation with extensions.
- [ ] Ensure `DATABASE_URL` in Vercel settings uses port `6543`.
- [ ] Verify that `api/index.ts` (or equivalent handler) exports a default function that awaits initialization.

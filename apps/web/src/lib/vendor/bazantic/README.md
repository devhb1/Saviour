# Vendored bazantic-cli gateway settle (0.5.0)

Subset used by `bazanticGrantSettle.ts` so Vercel serverless does not
package pnpm-symlinked `node_modules/bazantic-cli` (deploy fails with
"invalid deployment package … files in symlinked directories").

`device-key.js` is trimmed to `canonicalJson` + `signPayload` only (no fs).

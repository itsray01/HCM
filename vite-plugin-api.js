// Vite dev-server plugin that mounts Vercel-style serverless functions from
// the `api/` directory as middleware. So `/api/place-photo?…` works in dev
// without needing `vercel dev`.
//
// Each api/*.js file must `export default async function handler(req, res)`
// using the Vercel/Next signature (req.query + res.status/.setHeader/.json).
//
// On the request we:
//   1. Match the path → resolve the absolute file path
//   2. ssrLoadModule it (lets Vite handle hot-reload of API files too)
//   3. Adapt the Node IncomingMessage / ServerResponse to add the Vercel
//      shims (req.query, res.status(), res.json()).
//   4. Invoke the handler.

import path from 'node:path';
import url  from 'node:url';

export function vercelApiPlugin({ apiDir = 'api' } = {}) {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      const root = server.config.root || process.cwd();

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const parsed = url.parse(req.url, true);
        const route  = (parsed.pathname || '').replace(/^\/api\//, '').replace(/\/$/, '');
        if (!route) return next();

        const file = path.resolve(root, apiDir, `${route}.js`);

        try {
          // ── Adapt the response object with the Vercel helpers ────────────
          if (typeof res.status !== 'function') {
            res.status = (code) => { res.statusCode = code; return res; };
          }
          if (typeof res.json !== 'function') {
            res.json = (data) => {
              if (!res.getHeader('Content-Type')) {
                res.setHeader('Content-Type', 'application/json');
              }
              res.end(JSON.stringify(data));
              return res;
            };
          }

          // ── Adapt the request object ─────────────────────────────────────
          req.query = parsed.query;

          // ── Load the handler via Vite (gives us hot-reload of API files) ─
          const mod = await server.ssrLoadModule(file);
          const handler = mod?.default;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `api/${route}.js has no default export` }));
            return;
          }

          await handler(req, res);
        } catch (err) {
          // Module-not-found → real 404 so the client sees a clean error.
          if (err?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/i.test(String(err?.message))) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `api/${route} not found` }));
            return;
          }
          // eslint-disable-next-line no-console
          console.error(`[vercel-api-dev] ${req.url}`, err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      });
    },
  };
}

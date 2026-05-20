// Server-side image proxy. Some hosts (TripAdvisor, Booking/bstatic, etc.)
// return 403 when the Referer is anything other than their own domain — so
// hotlinking a `dynamic-media-cdn.tripadvisor.com` URL into a card photo
// fails with a broken image. This proxy refetches the image with a clean,
// browser-like UA and no cross-site Referer, then streams the bytes back.
//
// Usage: /api/image-proxy?url=<ENCODED_URL>
//
// Response: the image bytes with the upstream Content-Type, plus a 24h cache
// header so Vercel's edge cache serves repeat hits for free.

export const config = { runtime: 'nodejs' };

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap — well under Vercel's body limit

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const { url } = req.query || {};
  if (!url || typeof url !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'missing url' }));
    return;
  }

  let target;
  try {
    target = new URL(url);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new Error('bad protocol');
    }
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'invalid url' }));
    return;
  }

  try {
    // Browser-like UA helps with hosts that 403 on `node-fetch` / curl UAs.
    // Send the host's own origin as Referer — most CDNs whitelist their
    // own domain even when blocking third-party referers.
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        Referer: `${target.protocol}//${target.host}/`,
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `upstream ${upstream.status}` }));
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    // Reject non-image responses (e.g. HTML error pages with 200 status).
    if (!/^image\//i.test(contentType)) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `not an image (${contentType})` }));
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'image too large' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buf.length));
    // 24h on the edge, allow stale-while-revalidate for fast subsequent hits.
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    );
    res.end(buf);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

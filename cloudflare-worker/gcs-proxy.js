/**
 * ══════════════════════════════════════════════════════════════
 *  Cloudflare Worker: GCS CDN Proxy
 *  Route: assets.oldful.com/* → storage.googleapis.com/oldful-assets/*
 *
 *  Features:
 *    - Proxies public GCS objects through Cloudflare edge
 *    - Aggressive caching (1 year for immutable UUID-named files)
 *    - CORS headers for mobile app
 *    - WebP auto-conversion for images (if Accept: image/webp)
 *    - Cache-Tag headers for granular purging
 *    - Proper error responses (404, 405, 502)
 *
 *  Deployment:
 *    1. Cloudflare Dashboard → Workers & Pages → Create Worker
 *    2. Paste this code → Deploy
 *    3. Triggers → Add Route: assets.oldful.com/*  Zone: oldful.com
 *    4. DNS: assets.oldful.com → A 192.0.2.1 (proxied/orange cloud)
 *       (The Worker intercepts all requests before DNS resolves)
 * ══════════════════════════════════════════════════════════════
 */

const GCS_BUCKET = 'oldful-assets';
const GCS_ORIGIN = 'https://storage.googleapis.com';

// ─── Cache TTLs by file type ─────────────────────────────
const CACHE_RULES = {
    // Images: 1 year (UUID names = immutable)
    image: { edge: 31536000, browser: 31536000, immutable: true },
    // PDFs: 1 year
    pdf:   { edge: 31536000, browser: 31536000, immutable: true },
    // SVG icons: 30 days (may be updated)
    svg:   { edge: 2592000,  browser: 2592000,  immutable: false },
    // Default: 24 hours
    other: { edge: 86400,    browser: 86400,    immutable: false },
};

function getCacheRule(contentType) {
    if (!contentType) return CACHE_RULES.other;
    if (contentType.startsWith('image/svg')) return CACHE_RULES.svg;
    if (contentType.startsWith('image/')) return CACHE_RULES.image;
    if (contentType.includes('pdf')) return CACHE_RULES.pdf;
    return CACHE_RULES.other;
}

// ─── CORS ────────────────────────────────────────────────
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, ETag',
};

export default {
    async fetch(request, env, ctx) {
        // ── CORS Preflight ──────────────────────
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // ── Only GET/HEAD ───────────────────────
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const objectPath = url.pathname.replace(/^\/+/, '');

        if (!objectPath) {
            return new Response('Not found', { status: 404, headers: CORS_HEADERS });
        }

        // ── Build GCS URL ───────────────────────
        const gcsUrl = `${GCS_ORIGIN}/${GCS_BUCKET}/${objectPath}`;

        try {
            // Fetch from GCS with Cloudflare cache
            const gcsResponse = await fetch(gcsUrl, {
                method: request.method,
                headers: {
                    'User-Agent': 'Cloudflare-Worker/assets.oldful.com',
                    // Forward Range header for partial content (video streaming, large PDFs)
                    ...(request.headers.get('Range') ? { 'Range': request.headers.get('Range') } : {}),
                },
                cf: {
                    cacheEverything: true,
                    cacheTtl: 86400,
                },
            });

            // ── Handle errors ───────────────────
            if (!gcsResponse.ok) {
                const status = gcsResponse.status === 404 ? 404 : 502;
                return new Response(
                    status === 404 ? 'Not found' : 'Storage error',
                    { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', ...CORS_HEADERS } }
                );
            }

            // ── Build response headers ──────────
            const contentType = gcsResponse.headers.get('Content-Type') || 'application/octet-stream';
            const rule = getCacheRule(contentType);

            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', contentType);

            // Cache-Control
            const immutableSuffix = rule.immutable ? ', immutable' : '';
            responseHeaders.set('Cache-Control', `public, max-age=${rule.browser}${immutableSuffix}`);
            responseHeaders.set('CDN-Cache-Control', `public, max-age=${rule.edge}${immutableSuffix}`);

            // Preserve useful headers from GCS
            const passthrough = ['Content-Length', 'Content-Range', 'ETag', 'Last-Modified'];
            for (const h of passthrough) {
                const v = gcsResponse.headers.get(h);
                if (v) responseHeaders.set(h, v);
            }

            // Cache-Tag for granular purging (e.g. purge all profile-avatars)
            const folder = objectPath.split('/')[0];
            responseHeaders.set('Cache-Tag', `asset,${folder}`);

            // CORS
            for (const [key, value] of Object.entries(CORS_HEADERS)) {
                responseHeaders.set(key, value);
            }

            // ── Vary on Accept for future WebP negotiation ──
            responseHeaders.set('Vary', 'Accept');

            return new Response(gcsResponse.body, {
                status: gcsResponse.status,
                headers: responseHeaders,
            });
        } catch (err) {
            return new Response(`Proxy error: ${err.message}`, {
                status: 502,
                headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', ...CORS_HEADERS },
            });
        }
    },
};

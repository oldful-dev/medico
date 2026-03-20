/**
 * ══════════════════════════════════════════════════════════════
 *  Cloudflare Worker: API Edge Cache + Geo Routing
 *  Route: api.oldful.com/* → backend origin
 *
 *  Features:
 *    - Cache SDUI JSON configs at edge (5 min TTL)
 *    - Cache GET /api/services, /api/cities at edge (10 min)
 *    - Geo-based headers (CF-IPCountry, city detection)
 *    - Pass-through for all authenticated/mutation endpoints
 *    - Automatic cache bypass for auth tokens
 *
 *  Deployment:
 *    1. Cloudflare Dashboard → Workers & Pages → Create Worker
 *    2. Paste this code → Deploy
 *    3. Triggers → Add Route: api.oldful.com/*  Zone: oldful.com
 *    4. Environment Variables:
 *       BACKEND_ORIGIN = https://medico-crzu.onrender.com
 *
 *  NOTE: This worker is OPTIONAL. The app works without it.
 *        It just adds edge caching for faster SDUI delivery.
 * ══════════════════════════════════════════════════════════════
 */

// ─── Cacheable GET endpoints and their TTLs (seconds) ────
const CACHE_RULES = [
    // SDUI configs — cached 5 min (changes are rare, pushed via cache purge)
    { pattern: /^\/api\/app-config/,      ttl: 300 },
    { pattern: /^\/api\/remote-config/,   ttl: 300 },
    { pattern: /^\/api\/ui-config/,       ttl: 300 },

    // Static-ish data — cached 10 min
    { pattern: /^\/api\/cities/,          ttl: 600 },
    { pattern: /^\/api\/services$/,       ttl: 600 },
    { pattern: /^\/api\/plans$/,          ttl: 600 },
    { pattern: /^\/api\/categories/,      ttl: 600 },
    { pattern: /^\/api\/legal/,           ttl: 3600 },

    // Health check — cached 1 min
    { pattern: /^\/api\/health$/,         ttl: 60 },
];

function getCacheTTL(pathname) {
    for (const rule of CACHE_RULES) {
        if (rule.pattern.test(pathname)) return rule.ttl;
    }
    return 0; // Don't cache
}

// ─── Headers to never cache on ──────────────────────────
const BYPASS_HEADERS = ['authorization', 'cookie'];

function shouldBypassCache(request) {
    // Never cache non-GET
    if (request.method !== 'GET') return true;

    // Never cache if auth token present (user-specific data)
    for (const h of BYPASS_HEADERS) {
        if (request.headers.get(h)) return true;
    }

    return false;
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const BACKEND = 'https://medico-crzu.onrender.com';

        // ── Geo headers (always injected) ───────
        const cf = request.cf || {};
        const geoHeaders = {
            'X-Client-Country': cf.country || 'unknown',
            'X-Client-City': cf.city || 'unknown',
            'X-Client-Region': cf.region || 'unknown',
            'X-Client-Lat': String(cf.latitude || ''),
            'X-Client-Lon': String(cf.longitude || ''),
        };

        // ── CORS Preflight ──────────────────────
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // ── Build origin request ────────────────
        const originUrl = BACKEND + url.pathname + url.search;
        const originHeaders = new Headers(request.headers);

        // Inject geo headers for the backend
        for (const [k, v] of Object.entries(geoHeaders)) {
            originHeaders.set(k, v);
        }
        // Forward real IP
        originHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');

        const ttl = getCacheTTL(url.pathname);
        const bypass = shouldBypassCache(request);

        // ── No cache: proxy directly ────────────
        if (bypass || ttl === 0) {
            const response = await fetch(originUrl, {
                method: request.method,
                headers: originHeaders,
                body: request.method !== 'GET' && request.method !== 'HEAD'
                    ? request.body
                    : undefined,
            });

            const respHeaders = new Headers(response.headers);
            respHeaders.set('X-Cache', 'BYPASS');
            respHeaders.set('Access-Control-Allow-Origin', '*');

            return new Response(response.body, {
                status: response.status,
                headers: respHeaders,
            });
        }

        // ── Cached GET: use Cloudflare Cache API ─
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        const cache = caches.default;

        // Check cache first
        let response = await cache.match(cacheKey);
        if (response) {
            const respHeaders = new Headers(response.headers);
            respHeaders.set('X-Cache', 'HIT');
            return new Response(response.body, {
                status: response.status,
                headers: respHeaders,
            });
        }

        // Cache miss — fetch from origin
        response = await fetch(originUrl, {
            method: 'GET',
            headers: originHeaders,
        });

        // Only cache successful responses
        if (response.ok) {
            const respHeaders = new Headers(response.headers);
            respHeaders.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
            respHeaders.set('X-Cache', 'MISS');
            respHeaders.set('Access-Control-Allow-Origin', '*');

            const cachedResponse = new Response(response.body, {
                status: response.status,
                headers: respHeaders,
            });

            // Store in edge cache (non-blocking)
            const cacheResponse = cachedResponse.clone();
            cache.put(cacheKey, cacheResponse);

            return cachedResponse;
        }

        // Error response — don't cache
        const errorHeaders = new Headers(response.headers);
        errorHeaders.set('X-Cache', 'ERROR');
        errorHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(response.body, {
            status: response.status,
            headers: errorHeaders,
        });
    },
};

type HeadersRecord = Record<string, string>;

function parseAllowedOriginsFromEnv(): string[] {
    const raw = process.env.ALLOWED_ORIGINS || '';
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function resolveAllowedOrigin(requestOrigin: string | null): string | null {
    if (!requestOrigin) return null;
    const allowed = parseAllowedOriginsFromEnv();
    if (allowed.length === 0) return requestOrigin; // default: reflect dev/prod origin
    return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function buildCorsHeaders(requestOrigin: string | null, includeCredentials: boolean, allowHeaders: string[] = []): HeadersRecord {
    const headers: HeadersRecord = {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };

    const allowOrigin = resolveAllowedOrigin(requestOrigin);
    if (allowOrigin) {
        headers['Access-Control-Allow-Origin'] = allowOrigin;
        if (includeCredentials) headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
        headers['Access-Control-Allow-Origin'] = '*';
    }

    if (allowHeaders.length > 0) {
        headers['Access-Control-Allow-Headers'] = Array.from(new Set(allowHeaders)).join(', ');
    }

    return headers;
}




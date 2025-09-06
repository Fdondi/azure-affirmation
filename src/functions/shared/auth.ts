export type ClientPrincipal = {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
};

type HeadersLike = Headers | Record<string, string | undefined> | { get(name: string): string | null | undefined };

function getHeader(headers: HeadersLike, name: string): string | null {
    // Prefer fetch Headers.get if present
    const anyHeaders: any = headers as any;
    if (anyHeaders && typeof anyHeaders.get === 'function') {
        return anyHeaders.get(name) ?? null;
    }
    // Fallback to index access (common in tests or plain objects)
    const record = headers as Record<string, string | undefined>;
    if (record) {
        // Use exact key as implemented in the function code (lowercase keys)
        if (name in record) return record[name] ?? null;
        // Attempt a simple case-insensitive lookup as a convenience
        const lower = name.toLowerCase();
        for (const key of Object.keys(record)) {
            if (key.toLowerCase() === lower) return record[key] ?? null;
        }
    }
    return null;
}

export function encodeClientPrincipalForHeader(clientPrincipal: ClientPrincipal): string {
    const json = JSON.stringify(clientPrincipal);
    // Browser-safe first; Node fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    if (typeof g.btoa === 'function') {
        return g.btoa(json);
    }
    // Node.js
    return Buffer.from(json, 'utf-8').toString('base64');
}

export function tryParseClientPrincipalFromHeaderValue(value: string | null): ClientPrincipal | null {
    if (!value) return null;
    try {
        const decoded = Buffer.from(value, 'base64').toString();
        const parsed = JSON.parse(decoded);
        return parsed as ClientPrincipal;
    } catch {
        return null;
    }
}

export function parseAuthenticatedUserFromHeaders(headers: HeadersLike, logger?: { log: (...args: any[]) => void }): ClientPrincipal | null {
    // Try Azure Static Web Apps header first
    const swa = getHeader(headers, 'x-ms-client-principal');
    let user: ClientPrincipal | null = null;
    if (swa) {
        user = tryParseClientPrincipalFromHeaderValue(swa);
        if (user && logger) logger.log('Authenticated user from Azure header:', user.userDetails);
    } else {
        const token = getHeader(headers, 'x-user-token');
        const parsed = tryParseClientPrincipalFromHeaderValue(token);
        if (parsed) {
            if (parsed.userDetails && Array.isArray(parsed.userRoles) && parsed.userRoles.includes('authenticated')) {
                user = parsed;
                if (logger) logger.log('Authenticated user from custom header:', user.userDetails);
            } else {
                if (logger) logger.log('User token invalid - not authenticated');
            }
        }
    }
    return user;
}

export function getAuthHeadersPresence(headers: HeadersLike): { xUserToken: boolean; xMsClientPrincipal: boolean } {
    return {
        xUserToken: !!getHeader(headers, 'x-user-token'),
        xMsClientPrincipal: !!getHeader(headers, 'x-ms-client-principal')
    };
}



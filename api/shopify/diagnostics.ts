
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Standard CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;

    const hasStoreDomain = !!storeDomain;
    const hasAdminToken = !!adminToken;
    const missing: string[] = [];

    if (!hasStoreDomain) {
        missing.push('SHOPIFY_STORE_DOMAIN');
    }
    if (!hasAdminToken) {
        missing.push('SHOPIFY_ADMIN_TOKEN');
    }

    const response = {
        ok: missing.length === 0,
        runtime: 'nodejs',
        hasStoreDomain,
        hasAdminToken,
        effectiveStoreDomain: hasStoreDomain ? storeDomain : null,
        missing,
    };

    return res.status(200).json(response);
}

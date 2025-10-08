
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Helper function to parse the 'Link' header from Shopify for pagination.
 */
const parseLinkHeader = (linkHeader: string | null): { next?: string, prev?: string } => {  
  if (!linkHeader) {
    return {};
  }
  const links: { [key: string]: string } = {};
  const parts = linkHeader.split(',');

  parts.forEach(part => {
    const section = part.split(';');
    if (section.length < 2) return;

    const urlMatch = section[0].match(/<(.+)>/);
    if (!urlMatch) return;
    const url = new URL(urlMatch[1]);
    const pageInfo = url.searchParams.get('page_info');
    
    const relMatch = section[1].match(/rel="(.+)"/);
    if (relMatch && pageInfo) {
      links[relMatch[1].trim()] = pageInfo;
    }
  });

  return { next: links.next, prev: links.previous };
};

const handleApiError = async (res: VercelResponse, shopifyResponse: Response) => {
    if (shopifyResponse.status === 403) {
        return res.status(403).json({ 
            ok: false, 
            code: "MISSING_SCOPE_READ_CUSTOMERS", 
            hint: "Activa el scope read_customers en tu app de Shopify y reinstala." 
        });
    }
    const contentType = shopifyResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        return res.status(502).json({ ok: false, code: 'BAD_DOMAIN_OR_PATH', message: `Shopify devolvió una respuesta no-JSON (status ${shopifyResponse.status}). Verifica el dominio de la tienda.` });
    }
    if (shopifyResponse.status === 401) {
        return res.status(401).json({ ok: false, code: 'UNAUTHORIZED', message: 'Token de acceso de Shopify inválido o con permisos insuficientes.' });
    }
    if (shopifyResponse.status === 429) {
        return res.status(429).json({ ok: false, code: 'RATE_LIMITED', message: 'Se ha excedido el límite de peticiones de la API de Shopify.' });
    }
    const errorJson = await shopifyResponse.json();
    return res.status(shopifyResponse.status).json({ ok: false, code: 'SHOPIFY_API_ERROR', message: 'Error en la API de Shopify.', details: errorJson });
};

const fetchFromShopify = async (url: string, adminToken: string) => {
    return fetch(url, {
        headers: {
            'X-Shopify-Access-Token': adminToken,
            'Accept': 'application/json',
        },
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Standard CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
    }

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;

    if (!storeDomain || !adminToken) {
        return res.status(500).json({ ok: false, code: 'MISSING_ENV', hint: 'Las variables de entorno del servidor de Shopify no están configuradas.' });
    }

    const { limit = '50', page_info, includeCustomers } = req.query;
    const apiVersion = '2024-10';
    
    // Requested fields to get all customer-related data points
    const fields = 'id,name,order_number,created_at,phone,email,customer,shipping_address,billing_address,total_price,currency,financial_status,fulfillment_status,line_items,note,tags';

    const params = new URLSearchParams({
        status: 'any',
        limit: Array.isArray(limit) ? limit[0] : limit,
        order: 'created_at desc',
        fields,
    });
    
    if (page_info && typeof page_info === 'string') {
        params.set('page_info', page_info);
    }
    
    const ordersApiUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?${params.toString()}`;

    try {
        // Step 1: Fetch orders
        const ordersResponse = await fetchFromShopify(ordersApiUrl, adminToken);
        if (!ordersResponse.ok) {
            return handleApiError(res, ordersResponse);
        }
        
        const linkHeader = ordersResponse.headers.get('Link');
        const pageInfo = parseLinkHeader(linkHeader);
        const ordersJson = await ordersResponse.json();
        const orders = ordersJson.orders || [];

        // Step 2: (Optional) Enrich with full customer data
        if (includeCustomers === 'true' && orders.length > 0) {
            const customerIds = [...new Set(orders.map((o: any) => o.customer?.id).filter(Boolean))];
            
            if (customerIds.length > 0) {
                // Shopify allows up to 250 customer IDs per request
                const customersApiUrl = `https://${storeDomain}/admin/api/${apiVersion}/customers.json?ids=${customerIds.join(',')}`;
                const customersResponse = await fetchFromShopify(customersApiUrl, adminToken);

                if (!customersResponse.ok) {
                    // If fetching customers fails, return the orders without enrichment but log the error.
                    console.error("Failed to enrich customer data, returning orders as-is.");
                    return handleApiError(res, customersResponse);
                }

                const customersJson = await customersResponse.json();
                const customersMap = new Map((customersJson.customers || []).map((c: any) => [c.id, c]));
                
                // Merge customer data back into orders
                orders.forEach((order: any) => {
                    if (order.customer && customersMap.has(order.customer.id)) {
                        const fullCustomerData = customersMap.get(order.customer.id);
                        // FIX: A value from a map could be null, which cannot be spread. This ensures we only spread actual objects.
                        if (fullCustomerData && typeof fullCustomerData === 'object') {
                            order.customer = { ...order.customer, ...fullCustomerData };
                        }
                    }
                });
            }
        }

        return res.status(200).json({ ok: true, data: { orders, pageInfo } });

    } catch (error) {
        console.error("Error fetching from Shopify:", error);
        return res.status(502).json({ ok: false, code: 'NETWORK_ERROR', message: 'Error de red al intentar conectar con Shopify.' });
    }
}
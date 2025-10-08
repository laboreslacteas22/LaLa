/**
 * Cloudflare Worker for a secure Shopify Admin API proxy.
 * Implements robust error handling, pagination, and specific endpoints as requested.
 */

// Helper to create a standardized JSON response with CORS headers
const JsonResponse = (data: any, status: number = 200, headers: HeadersInit = {}) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Adjust in production if needed
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            ...headers,
        },
    });
};

// Helper to parse the 'Link' header from Shopify for pagination
const parseLinkHeader = (linkHeader: string | null) => {  
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
      links[relMatch[1]] = pageInfo;
    }
  });

  return { next: links.next, prev: links.previous };
};


// Main fetch handler that acts as a router
export default {
    async fetch(request: Request): Promise<Response> {
        // Handle CORS pre-flight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        const url = new URL(request.url);
        const pathname = url.pathname;

        try {
            if (pathname.endsWith('/shopify/test')) {
                return await handleTestConnection(request);
            }

            if (pathname.endsWith('/shopify/orders')) {
                return await handleFetchOrders(request);
            }
            
            // Legacy routes for backwards compatibility during transition
            if (pathname.endsWith('/test-shopify-connection')) {
                return await handleTestConnection(request);
            }
            if (pathname.endsWith('/fetch-orders')) {
                return await handleFetchOrders(request);
            }

            return JsonResponse({ error: `Route not found: ${pathname}` }, 404);

        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown worker error.';
            console.error("Worker Global Error:", e);
            return JsonResponse({ error: 'Internal Server Error', details: message }, 500);
        }
    },
};

// Shared function to interpret Shopify API errors
async function handleShopifyApiError(shopifyResponse: Response) {
    const requestId = shopifyResponse.headers.get('x-request-id') || undefined;
    const contentType = shopifyResponse.headers.get('content-type') || '';

    // If Shopify returns a non-JSON response, it's likely an auth or domain issue
    if (!contentType.includes('application/json')) {
        return {
            status: 502, // Bad Gateway
            body: { error: 'BAD_DOMAIN_OR_PATH', details: `Received non-JSON response from Shopify (status ${shopifyResponse.status}). Verify store domain and API path.`, requestId }
        };
    }
    
    const errorBody = await shopifyResponse.json();

    switch (shopifyResponse.status) {
        case 401:
        case 403:
            return { status: 401, body: { error: 'UNAUTHORIZED', details: errorBody.errors || 'Invalid token or insufficient scopes.', requestId } };
        case 429:
            return { status: 429, body: { error: 'RATE_LIMITED', details: `Retry after ${shopifyResponse.headers.get('Retry-After')} seconds.`, requestId } };
        default:
            return { status: shopifyResponse.status, body: { error: 'SHOPIFY_API_ERROR', details: errorBody.errors || 'Unknown Shopify API error.', requestId } };
    }
}


// Handler for /shopify/test
async function handleTestConnection(request: Request): Promise<Response> {
    if (request.method !== 'POST') return JsonResponse({ error: 'Method Not Allowed' }, 405);
    
    const { storeUrl, apiToken } = await request.json() as { storeUrl: string, apiToken: string };

    if (!storeUrl || !apiToken) {
        return JsonResponse({ success: false, error: 'storeUrl and apiToken are required.' }, 400);
    }

    const shopifyApiUrl = `https://${storeUrl}/admin/api/2024-07/shop.json`;

    try {
        const shopifyResponse = await fetch(shopifyApiUrl, {
            headers: { 'X-Shopify-Access-Token': apiToken, 'Content-Type': 'application/json' },
        });

        if (!shopifyResponse.ok) {
            const { status, body } = await handleShopifyApiError(shopifyResponse);
            return JsonResponse({ success: false, ...body }, status);
        }

        const data = await shopifyResponse.json();
        return JsonResponse({ success: true, shopName: data.shop.name });
    } catch (error) {
         return JsonResponse({ success: false, error: 'NETWORK_ERROR', details: 'Failed to connect to Shopify. Check the domain and network settings.' }, 500);
    }
}

// Handler for /shopify/orders
async function handleFetchOrders(request: Request): Promise<Response> {
    if (request.method !== 'POST') return JsonResponse({ error: 'Method Not Allowed' }, 405);

    const { 
        storeUrl, 
        apiToken, 
        limit = 50, 
        page_info, 
        updated_at_min 
    } = await request.json() as { storeUrl: string, apiToken: string, limit?: number, page_info?: string, updated_at_min?: string };

    if (!storeUrl || !apiToken) {
        return JsonResponse({ error: 'storeUrl and apiToken are required.' }, 400);
    }

    const apiVersion = '2024-07';
    // Fields useful for couriers as requested
    const fields = 'id,name,order_number,created_at,customer,shipping_address,phone,current_total_price,financial_status,fulfillment_status,cancelled_at,closed_at,line_items(title,quantity),note,tags';

    const params = new URLSearchParams({
        status: 'any',
        limit: String(limit),
        order: 'created_at desc',
        fields,
    });
    
    if (page_info) params.set('page_info', page_info);
    if (updated_at_min) params.set('updated_at_min', updated_at_min);

    const shopifyApiUrl = `https://${storeUrl}/admin/api/${apiVersion}/orders.json?${params.toString()}`;

    try {
        const shopifyResponse = await fetch(shopifyApiUrl, {
            headers: { 'X-Shopify-Access-Token': apiToken, 'Content-Type': 'application/json' },
        });
        
        const requestId = shopifyResponse.headers.get('x-request-id') || undefined;

        if (!shopifyResponse.ok) {
            const { status, body } = await handleShopifyApiError(shopifyResponse);
            return JsonResponse(body, status);
        }

        const data = await shopifyResponse.json();
        const linkHeader = shopifyResponse.headers.get('Link');
        const pageInfo = parseLinkHeader(linkHeader);
        
        return JsonResponse({
          data: {
            orders: data.orders,
            pageInfo,
          },
          requestId
        });

    } catch (error) {
        return JsonResponse({ error: 'NETWORK_ERROR', details: 'Failed to connect to Shopify. Check the domain and network settings.' }, 500);
    }
}
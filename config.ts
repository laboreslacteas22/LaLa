// This file centralizes the API configuration.
// In development, it points to the local worker.
// In production, it uses a relative path, assuming the API is served from the same domain.
export const API_BASE_URL = (import.meta as any).env.DEV ? 'http://localhost:8787' : '';
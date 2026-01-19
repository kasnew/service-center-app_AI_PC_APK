export const apiClient = {
    token: '',
    baseUrl: '',

    init: async () => {
        try {
            // In development (Vite), we might want to proxy or point to a hardcoded IP
            // In production (Android WebView/Browser), relative path /api usually works if served from same origin
            // But since we are likely testing on PC accessing phone IP:
            // If served via Ktor on Phone, relative path works.

            // Allow overriding base URL for testing
            const baseUrl = window.location.port === '5173'
                ? 'http://192.168.50.207:8080' // Hardcoded for dev, or use env var
                : '';

            apiClient.baseUrl = baseUrl;

            const res = await fetch(`${baseUrl}/api/server-info`);
            if (!res.ok) throw new Error('Failed to get server info');

            const info = await res.json();
            apiClient.token = info.token;
            console.log('Connected to server:', info);
            return true;
        } catch (e) {
            console.error('Failed to initialize API client:', e);
            return false;
        }
    },

    getHeaders: () => {
        return {
            'Authorization': `Bearer ${apiClient.token}`,
            'Content-Type': 'application/json'
        };
    },

    get: async (endpoint: string, params: Record<string, any> = {}) => {
        const url = new URL(`${apiClient.baseUrl}/api${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, String(params[key]));
            }
        });

        const res = await fetch(url.toString(), {
            headers: apiClient.getHeaders()
        });

        if (!res.ok) {
            throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }

        return await res.json();
    },

    post: async (endpoint: string, body: any) => {
        const res = await fetch(`${apiClient.baseUrl}/api${endpoint}`, {
            method: 'POST',
            headers: apiClient.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
        }

        return await res.json();
    },

    put: async (endpoint: string, body: any) => {
        const res = await fetch(`${apiClient.baseUrl}/api${endpoint}`, {
            method: 'PUT',
            headers: apiClient.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
        }

        return await res.json();
    },

    delete: async (endpoint: string) => {
        const res = await fetch(`${apiClient.baseUrl}/api${endpoint}`, {
            method: 'DELETE',
            headers: apiClient.getHeaders()
        });

        if (!res.ok) {
            throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }

        return await res.json();
    }
};

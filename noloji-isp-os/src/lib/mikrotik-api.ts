// MikroTik Service API Client
// Connects the frontend to the MikroTik backend service

const MIKROTIK_URL = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

interface EnforcementResult {
    success: boolean;
    action: string;
    customerId: number;
    error?: string;
}

interface RouterResources {
    uptime: string;
    cpuLoad: number;
    freeMemory: number;
    totalMemory: number;
    version: string;
    boardName: string;
}

interface ActiveSession {
    '.id': string;
    user?: string;
    name?: string;
    address: string;
    uptime: string;
    'bytes-in'?: string;
    'bytes-out'?: string;
}

/**
 * MikroTik Service API Client
 */
export const mikrotikApi = {
    /**
     * Health check
     */
    async health(): Promise<{ status: string; service: string }> {
        const response = await fetch(`${MIKROTIK_URL}/health`);
        return response.json();
    },

    // ============================================
    // Router Management
    // ============================================

    /**
     * Test connection to a router
     */
    async testRouterConnection(routerId: number): Promise<ApiResponse<{ connected: boolean; identity?: string }>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/test`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Get router system resources
     */
    async getRouterResources(routerId: number): Promise<RouterResources | null> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/resources`);
        return response.json();
    },

    /**
     * Get all profiles (hotspot + PPPoE) from a router
     */
    async getRouterProfiles(routerId: number): Promise<ApiResponse<{ name: string; type: 'HOTSPOT' | 'PPPOE'; rateLimit?: string }[]>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/profiles`);
        const result = await response.json();
        return { success: result.success, data: result.profiles, error: result.error };
    },

    // ============================================
    // Hotspot Management
    // ============================================

    /**
     * Get active hotspot users on a router
     */
    async getActiveHotspotUsers(routerId: number): Promise<ApiResponse<ActiveSession[]>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/hotspot/active`);
        return response.json();
    },

    /**
     * Disconnect a hotspot user
     */
    async disconnectHotspotUser(routerId: number, username: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/hotspot/disconnect/${username}`, {
            method: 'POST',
        });
        return response.json();
    },

    // ============================================
    // PPPoE Management
    // ============================================

    /**
     * Get active PPPoE sessions on a router
     */
    async getActivePPPoESessions(routerId: number): Promise<ApiResponse<ActiveSession[]>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/pppoe/active`);
        return response.json();
    },

    /**
     * Disconnect a PPPoE session
     */
    async disconnectPPPoESession(routerId: number, username: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/pppoe/disconnect/${username}`, {
            method: 'POST',
        });
        return response.json();
    },

    // ============================================
    // Queue Management
    // ============================================

    /**
     * Get all simple queues on a router
     */
    async getQueues(routerId: number): Promise<ApiResponse<any[]>> {
        const response = await fetch(`${MIKROTIK_URL}/api/routers/${routerId}/queues`);
        return response.json();
    },

    // ============================================
    // Billing Enforcement
    // ============================================

    /**
     * Suspend a customer's internet access
     */
    async suspendCustomer(customerId: number): Promise<EnforcementResult> {
        const response = await fetch(`${MIKROTIK_URL}/api/customers/${customerId}/suspend`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Activate a customer's internet access
     */
    async activateCustomer(customerId: number): Promise<EnforcementResult> {
        const response = await fetch(`${MIKROTIK_URL}/api/customers/${customerId}/activate`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Provision a new customer on their assigned router
     */
    async provisionCustomer(customerId: number): Promise<EnforcementResult> {
        const response = await fetch(`${MIKROTIK_URL}/api/customers/${customerId}/provision`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Change customer speed (package upgrade/downgrade)
     */
    async changeCustomerSpeed(customerId: number, planId: number): Promise<EnforcementResult> {
        const response = await fetch(`${MIKROTIK_URL}/api/customers/${customerId}/speed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
        });
        return response.json();
    },

    /**
     * Process all expired subscriptions
     */
    async processExpiredSubscriptions(): Promise<{ processed: number; results: EnforcementResult[] }> {
        const response = await fetch(`${MIKROTIK_URL}/api/billing/process-expired`, {
            method: 'POST',
        });
        return response.json();
    },

    // ============================================
    // Utilities
    // ============================================

    /**
     * Encrypt a password for router storage
     */
    async encryptPassword(password: string): Promise<{ encrypted: string }> {
        const response = await fetch(`${MIKROTIK_URL}/api/utils/encrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        return response.json();
    },
};

export default mikrotikApi;

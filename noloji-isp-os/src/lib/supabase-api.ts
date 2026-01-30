// Supabase API functions for Nolojia Billing
// This file provides typed API functions using Supabase client

import { supabase, signIn, signUp, signOut, getCurrentUser } from './supabase';
import type {
    Admin, Router, Plan, Customer, Voucher, Session,
    SmsCredit, SmsLog, SmsTemplate
} from './database.types';

// ============================================
// Auth API
// ============================================
export const supabaseAuthApi = {
    login: async (email: string, password: string) => {
        const { session, user } = await signIn(email, password);

        // Try to get admin profile, but don't fail if it doesn't exist yet
        let admin = null;
        if (user) {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .eq('id', user.id)
                .single();

            // Ignore errors - admin profile might not exist yet
            if (!error && data) {
                admin = data;
            }
        }

        return {
            session,
            user,
            admin,
            token: session?.access_token
        };
    },

    register: async (email: string, password: string, fullName?: string, phone?: string) => {
        const { session, user } = await signUp(email, password, {
            full_name: fullName,
            phone
        });

        return { session, user };
    },

    logout: async () => {
        await signOut();
    },

    getCurrentUser: async () => {
        const user = await getCurrentUser();
        if (!user) return null;

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', user.id)
            .single();

        // Return null if admin profile doesn't exist (don't throw)
        if (error || !admin) {
            console.log('Admin profile not found - may need to run database setup');
            return null;
        }
        return admin;
    },

    updateProfile: async (updates: { full_name?: string; phone?: string }) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('admins')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// ============================================
// Plans API
// ============================================
export const supabasePlanApi = {
    getAll: async (): Promise<Plan[]> => {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    getById: async (id: number): Promise<Plan> => {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    create: async (plan: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> => {
        const { data, error } = await supabase
            .from('plans')
            .insert(plan)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    update: async (id: number, updates: Partial<Plan>): Promise<Plan> => {
        const { data, error } = await supabase
            .from('plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    delete: async (id: number): Promise<void> => {
        const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================
// Customers API
// ============================================
export const supabaseCustomerApi = {
    getAll: async (options?: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
        planId?: number;
    }): Promise<{ data: Customer[]; count: number }> => {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('customers')
            .select('*, plans:plan_id(*), routers:router_id(*)', { count: 'exact' });

        if (options?.search) {
            query = query.or(`username.ilike.%${options.search}%,full_name.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
        }

        if (options?.isActive !== undefined) {
            query = query.eq('is_active', options.isActive);
        }

        if (options?.planId) {
            query = query.eq('plan_id', options.planId);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data: data || [], count: count || 0 };
    },

    getById: async (id: number): Promise<Customer> => {
        const { data, error } = await supabase
            .from('customers')
            .select('*, plans:plan_id(*), routers:router_id(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
        const { data, error } = await supabase
            .from('customers')
            .insert(customer)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    update: async (id: number, updates: Partial<Customer>): Promise<Customer> => {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    delete: async (id: number): Promise<void> => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    getStats: async () => {
        const { count: total } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        const { count: active } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { count: online } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('is_online', true);

        return { total: total || 0, active: active || 0, online: online || 0 };
    }
};

// ============================================
// Routers API
// ============================================
export const supabaseRouterApi = {
    getAll: async (isActive?: boolean): Promise<Router[]> => {
        let query = supabase.from('routers').select('*');

        if (isActive !== undefined) {
            query = query.eq('is_active', isActive);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        return data || [];
    },

    getById: async (id: number): Promise<Router> => {
        const { data, error } = await supabase
            .from('routers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    create: async (router: Omit<Router, 'id' | 'created_at' | 'updated_at'>): Promise<Router> => {
        const { data, error } = await supabase
            .from('routers')
            .insert(router)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    update: async (id: number, updates: Partial<Router>): Promise<Router> => {
        const { data, error } = await supabase
            .from('routers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    delete: async (id: number): Promise<void> => {
        const { error } = await supabase
            .from('routers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    updateStatus: async (id: number, isActive: boolean): Promise<Router> => {
        return supabaseRouterApi.update(id, { is_active: isActive });
    }
};

// ============================================
// Vouchers API
// ============================================
export const supabaseVoucherApi = {
    getAll: async (options?: {
        status?: string;
        batchId?: string;
        planId?: number;
    }): Promise<Voucher[]> => {
        let query = supabase
            .from('vouchers')
            .select('*, plans:plan_id(*)');

        if (options?.status) {
            query = query.eq('status', options.status);
        }

        if (options?.batchId) {
            query = query.eq('batch_id', options.batchId);
        }

        if (options?.planId) {
            query = query.eq('plan_id', options.planId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getByCode: async (code: string): Promise<Voucher> => {
        const { data, error } = await supabase
            .from('vouchers')
            .select('*, plans:plan_id(*)')
            .eq('code', code)
            .single();

        if (error) throw error;
        return data;
    },

    generate: async (params: {
        plan_id: number;
        quantity: number;
        validity_days: number;
        include_pin?: boolean;
        batch_name?: string;
    }): Promise<Voucher[]> => {
        const vouchers: Omit<Voucher, 'id'>[] = [];
        const batchId = params.batch_name || `BATCH-${Date.now()}`;
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + params.validity_days);

        for (let i = 0; i < params.quantity; i++) {
            const code = generateVoucherCode(12);
            const pin = params.include_pin ? generateVoucherCode(4, true) : undefined;

            vouchers.push({
                code,
                pin,
                plan_id: params.plan_id,
                batch_id: batchId,
                status: 'active',
                valid_from: new Date().toISOString(),
                valid_until: validUntil.toISOString(),
                used_by: undefined,
                used_at: undefined,
                created_by: 'admin',
                notes: undefined,
                created_at: new Date().toISOString()
            });
        }

        const { data, error } = await supabase
            .from('vouchers')
            .insert(vouchers)
            .select();

        if (error) throw error;
        return data || [];
    },

    updateStatus: async (code: string, status: string): Promise<Voucher> => {
        const { data, error } = await supabase
            .from('vouchers')
            .update({ status })
            .eq('code', code)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    getStats: async () => {
        const { count: total } = await supabase
            .from('vouchers')
            .select('*', { count: 'exact', head: true });

        const { count: active } = await supabase
            .from('vouchers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const { count: used } = await supabase
            .from('vouchers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'used');

        return { total: total || 0, active: active || 0, used: used || 0 };
    }
};

// ============================================
// Sessions API
// ============================================
export const supabaseSessionApi = {
    getActive: async (): Promise<Session[]> => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*, customers:customer_id(*), routers:router_id(*)')
            .eq('status', 'active')
            .order('start_time', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getAll: async (options?: {
        username?: string;
        status?: string;
        limit?: number;
    }): Promise<Session[]> => {
        let query = supabase
            .from('sessions')
            .select('*, customers:customer_id(*), routers:router_id(*)');

        if (options?.username) {
            query = query.eq('username', options.username);
        }

        if (options?.status) {
            query = query.eq('status', options.status);
        }

        const { data, error } = await query
            .order('start_time', { ascending: false })
            .limit(options?.limit || 100);

        if (error) throw error;
        return data || [];
    },

    getStats: async (period: '24h' | '7d' | '30d' = '24h') => {
        const now = new Date();
        let since: Date;

        switch (period) {
            case '7d':
                since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const { count: totalSessions } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .gte('start_time', since.toISOString());

        const { count: activeSessions } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        return { totalSessions: totalSessions || 0, activeSessions: activeSessions || 0 };
    },

    getOnlineCount: async (): Promise<number> => {
        const { count, error } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        if (error) throw error;
        return count || 0;
    }
};

// ============================================
// SMS API
// ============================================
export const supabaseSmsApi = {
    // Credits
    getBalance: async (): Promise<SmsCredit> => {
        const { data, error } = await supabase
            .from('sms_credits')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;
        return data;
    },

    addCredits: async (amount: number): Promise<SmsCredit> => {
        const current = await supabaseSmsApi.getBalance();
        const { data, error } = await supabase
            .from('sms_credits')
            .update({ balance: current.balance + amount })
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updatePricing: async (costPerSms: number, currency?: string): Promise<SmsCredit> => {
        const current = await supabaseSmsApi.getBalance();
        const { data, error } = await supabase
            .from('sms_credits')
            .update({
                cost_per_sms: costPerSms,
                ...(currency && { currency })
            })
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Logs
    getLogs: async (options?: {
        customerId?: number;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ data: SmsLog[]; count: number }> => {
        let query = supabase
            .from('sms_logs')
            .select('*, customers:customer_id(*)', { count: 'exact' });

        if (options?.customerId) {
            query = query.eq('customer_id', options.customerId);
        }

        if (options?.status) {
            query = query.eq('status', options.status);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

        if (error) throw error;
        return { data: data || [], count: count || 0 };
    },

    getStats: async () => {
        const { count: total } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true });

        const { count: sent } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'sent');

        const { count: delivered } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'delivered');

        const { count: failed } = await supabase
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed');

        return { total: total || 0, sent: sent || 0, delivered: delivered || 0, failed: failed || 0 };
    },

    // Templates
    getTemplates: async (category?: string): Promise<SmsTemplate[]> => {
        let query = supabase.from('sms_templates').select('*');

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        return data || [];
    },

    createTemplate: async (template: Omit<SmsTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<SmsTemplate> => {
        const { data, error } = await supabase
            .from('sms_templates')
            .insert(template)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    updateTemplate: async (id: number, updates: Partial<SmsTemplate>): Promise<SmsTemplate> => {
        const { data, error } = await supabase
            .from('sms_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteTemplate: async (id: number): Promise<void> => {
        const { error } = await supabase
            .from('sms_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================
// Dashboard API
// ============================================
export const supabaseDashboardApi = {
    getKPIs: async () => {
        const customerStats = await supabaseCustomerApi.getStats();
        const sessionStats = await supabaseSessionApi.getStats('30d');
        const voucherStats = await supabaseVoucherApi.getStats();

        return {
            totalCustomers: customerStats.total,
            activeCustomers: customerStats.active,
            onlineUsers: customerStats.online,
            activeSessions: sessionStats.activeSessions,
            totalVouchers: voucherStats.total,
            activeVouchers: voucherStats.active,
            usedVouchers: voucherStats.used
        };
    }
};

// ============================================
// Helper Functions
// ============================================
function generateVoucherCode(length: number, numericOnly: boolean = false): string {
    const chars = numericOnly
        ? '0123456789'
        : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// Export all APIs
// ============================================
export const supabaseApi = {
    auth: supabaseAuthApi,
    plans: supabasePlanApi,
    customers: supabaseCustomerApi,
    routers: supabaseRouterApi,
    vouchers: supabaseVoucherApi,
    sessions: supabaseSessionApi,
    sms: supabaseSmsApi,
    dashboard: supabaseDashboardApi
};

export default supabaseApi;

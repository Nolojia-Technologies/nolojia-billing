import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { SmsCredit, SmsLog, SmsTemplate, SmsStats } from '@/lib/database.types';

// ============================================================================
// SMS Balance Hook
// ============================================================================

export function useSmsBalance() {
    const [balance, setBalance] = useState<SmsCredit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('sms_credits')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;
            setBalance(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const addCredits = async (amount: number, costPerSms?: number) => {
        if (!balance) return { error: 'No balance record found' };

        try {
            const updates: Partial<SmsCredit> = {
                balance: balance.balance + amount,
            };
            if (costPerSms !== undefined) {
                updates.cost_per_sms = costPerSms;
            }

            const { data, error } = await supabase
                .from('sms_credits')
                .update(updates)
                .eq('id', balance.id)
                .select()
                .single();

            if (error) throw error;
            setBalance(data);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const updatePricing = async (costPerSms: number, currency?: string) => {
        if (!balance) return { error: 'No balance record found' };

        try {
            const updates: Partial<SmsCredit> = { cost_per_sms: costPerSms };
            if (currency) updates.currency = currency;

            const { data, error } = await supabase
                .from('sms_credits')
                .update(updates)
                .eq('id', balance.id)
                .select()
                .single();

            if (error) throw error;
            setBalance(data);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const deductCredits = async (amount: number) => {
        if (!balance) return { error: 'No balance record found' };
        if (balance.balance < amount) return { error: 'Insufficient credits' };

        try {
            const { data, error } = await supabase
                .from('sms_credits')
                .update({ balance: balance.balance - amount })
                .eq('id', balance.id)
                .select()
                .single();

            if (error) throw error;
            setBalance(data);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    return {
        balance,
        loading,
        error,
        refresh: fetchBalance,
        addCredits,
        updatePricing,
        deductCredits
    };
}

// ============================================================================
// SMS Stats Hook
// ============================================================================

export function useSmsStats() {
    const [stats, setStats] = useState<SmsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Get total count
            const { count: total } = await supabase
                .from('sms_logs')
                .select('*', { count: 'exact', head: true });

            // Get sent count
            const { count: sent } = await supabase
                .from('sms_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'sent');

            // Get delivered count
            const { count: delivered } = await supabase
                .from('sms_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'delivered');

            // Get failed count
            const { count: failed } = await supabase
                .from('sms_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'failed');

            // Get total credits used (sum of costs)
            const { data: costData } = await supabase
                .from('sms_logs')
                .select('cost')
                .not('cost', 'is', null);

            const totalCreditsUsed = costData?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;

            setStats({
                total: total || 0,
                sent: sent || 0,
                delivered: delivered || 0,
                failed: failed || 0,
                total_credits_used: Math.ceil(totalCreditsUsed)
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refresh: fetchStats };
}

// ============================================================================
// SMS Logs Hook
// ============================================================================

interface SmsLogsFilters {
    status?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
}

export function useSmsLogs(filters?: SmsLogsFilters) {
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('sms_logs')
                .select('*, customers:customer_id(username, full_name, phone)', { count: 'exact' });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.search) {
                query = query.or(`recipient.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
            }

            if (filters?.from_date) {
                query = query.gte('created_at', filters.from_date);
            }

            if (filters?.to_date) {
                query = query.lte('created_at', filters.to_date);
            }

            const limit = filters?.limit || 50;
            const offset = filters?.offset || 0;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            setLogs(data || []);
            setTotalCount(count || 0);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters?.status, filters?.search, filters?.from_date, filters?.to_date, filters?.limit, filters?.offset]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return { logs, loading, error, totalCount, refresh: fetchLogs };
}

// ============================================================================
// SMS Templates Hook
// ============================================================================

export function useSmsTemplates(category?: string) {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('sms_templates')
                .select('*')
                .eq('is_active', true);

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query.order('name');

            if (error) throw error;
            setTemplates(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [category]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const createTemplate = async (template: Omit<SmsTemplate, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const { data, error } = await supabase
                .from('sms_templates')
                .insert(template)
                .select()
                .single();

            if (error) throw error;
            setTemplates(prev => [...prev, data]);
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const updateTemplate = async (id: number, updates: Partial<SmsTemplate>) => {
        try {
            const { data, error } = await supabase
                .from('sms_templates')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setTemplates(prev => prev.map(t => t.id === id ? data : t));
            return { data, error: null };
        } catch (err: any) {
            return { data: null, error: err.message };
        }
    };

    const deleteTemplate = async (id: number) => {
        try {
            const { error } = await supabase
                .from('sms_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTemplates(prev => prev.filter(t => t.id !== id));
            return { error: null };
        } catch (err: any) {
            return { error: err.message };
        }
    };

    return {
        templates,
        loading,
        error,
        refresh: fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate
    };
}

// ============================================================================
// Send SMS Hook
// ============================================================================

export function useSendSms() {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendSms = async (recipient: string, message: string, senderId?: string, customerId?: number) => {
        setSending(true);
        setError(null);

        try {
            // Call the API route which handles Bytewave integration
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient,
                    message,
                    sender_id: senderId || 'BytewaveSMS',
                    customer_id: customerId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send SMS');
            }

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { data: null, error: err.message };
        } finally {
            setSending(false);
        }
    };

    const sendBulkSms = async (recipients: string[], message: string, senderId?: string) => {
        setSending(true);
        setError(null);

        try {
            const response = await fetch('/api/sms/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients,
                    message,
                    sender_id: senderId || 'BytewaveSMS'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send bulk SMS');
            }

            return { data, error: null };
        } catch (err: any) {
            setError(err.message);
            return { data: null, error: err.message };
        } finally {
            setSending(false);
        }
    };

    return { sendSms, sendBulkSms, sending, error };
}

// ============================================================================
// Customer Selection Hook for SMS
// ============================================================================

export type CustomerFilter =
    | 'all'
    | 'online'
    | 'offline'
    | 'active'
    | 'inactive'
    | 'expiring_soon'  // expires within 3 days
    | 'expired';

interface CustomerForSms {
    id: number;
    username: string;
    full_name?: string;
    phone?: string;
    is_online: boolean;
    is_active: boolean;
    valid_until?: string;
    plan_name?: string;
}

export function useCustomersForSms() {
    const [customers, setCustomers] = useState<CustomerForSms[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCustomers = useCallback(async (filter: CustomerFilter, planId?: number) => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('customers')
                .select('id, username, full_name, phone, is_online, is_active, valid_until, plans(name)')
                .not('phone', 'is', null)
                .neq('phone', '');

            // Apply filters
            switch (filter) {
                case 'online':
                    query = query.eq('is_online', true).eq('is_active', true);
                    break;
                case 'offline':
                    query = query.eq('is_online', false).eq('is_active', true);
                    break;
                case 'active':
                    query = query.eq('is_active', true);
                    break;
                case 'inactive':
                    query = query.eq('is_active', false);
                    break;
                case 'expiring_soon':
                    const threeDaysFromNow = new Date();
                    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                    query = query
                        .eq('is_active', true)
                        .not('valid_until', 'is', null)
                        .lte('valid_until', threeDaysFromNow.toISOString())
                        .gte('valid_until', new Date().toISOString());
                    break;
                case 'expired':
                    query = query
                        .not('valid_until', 'is', null)
                        .lt('valid_until', new Date().toISOString());
                    break;
                case 'all':
                default:
                    query = query.eq('is_active', true);
                    break;
            }

            // Filter by plan if specified
            if (planId) {
                query = query.eq('plan_id', planId);
            }

            const { data, error } = await query.order('full_name');

            if (error) throw error;

            const formattedData: CustomerForSms[] = (data || []).map((c: any) => ({
                id: c.id,
                username: c.username,
                full_name: c.full_name,
                phone: c.phone,
                is_online: c.is_online,
                is_active: c.is_active,
                valid_until: c.valid_until,
                plan_name: c.plans?.name
            }));

            setCustomers(formattedData);
            return { data: formattedData, error: null };
        } catch (err: any) {
            setError(err.message);
            return { data: null, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const getPhoneNumbers = useCallback(() => {
        return customers
            .filter(c => c.phone)
            .map(c => c.phone as string);
    }, [customers]);

    return { customers, loading, error, fetchCustomers, getPhoneNumbers };
}

// ============================================================================
// Plans Hook for filtering
// ============================================================================

export function usePlansForFilter() {
    const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            const { data } = await supabase
                .from('plans')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            setPlans(data || []);
            setLoading(false);
        };

        fetchPlans();
    }, []);

    return { plans, loading };
}

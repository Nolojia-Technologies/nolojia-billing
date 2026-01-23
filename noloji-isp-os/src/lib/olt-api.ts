// OLT Supabase API - CRUD operations for OLT management
// Uses service role for backend operations

import { createClient } from '@supabase/supabase-js';
import {
    Olt, OltInsert, OltUpdate,
    OltPort, OltPortInsert,
    Onu, OnuInsert, OnuUpdate,
    OltWithPorts, OltWithOnus
} from '@/types/olt-acs.types';
import { encryptCredential, decryptCredential, maskCredential } from './credential-encryption';

// Create service role client for backend operations
function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// ============================================
// OLT OPERATIONS
// ============================================

export const oltApi = {
    /**
     * Get all OLTs for a workspace
     */
    async getAll(workspaceId: string): Promise<Olt[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('olts')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('name');

        if (error) throw error;

        // Mask credentials in response
        return (data || []).map(olt => ({
            ...olt,
            snmp_community_encrypted: olt.snmp_community_encrypted ? '****encrypted****' : null,
            api_username_encrypted: olt.api_username_encrypted ? maskCredential(decryptCredential(olt.api_username_encrypted)) : null,
            api_password_encrypted: olt.api_password_encrypted ? '****encrypted****' : null,
        }));
    },

    /**
     * Get a single OLT by ID
     */
    async getById(id: string): Promise<Olt | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('olts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },

    /**
     * Get OLT with decrypted credentials (for internal use only)
     */
    async getWithCredentials(id: string): Promise<{
        olt: Olt;
        snmpCommunity: string;
        apiUsername: string;
        apiPassword: string;
    } | null> {
        const olt = await this.getById(id);
        if (!olt) return null;

        return {
            olt,
            snmpCommunity: decryptCredential(olt.snmp_community_encrypted || ''),
            apiUsername: decryptCredential(olt.api_username_encrypted || ''),
            apiPassword: decryptCredential(olt.api_password_encrypted || ''),
        };
    },

    /**
     * Create a new OLT
     */
    async create(data: OltInsert & {
        snmp_community?: string;
        api_username?: string;
        api_password?: string;
    }): Promise<Olt> {
        const supabase = getServiceClient();

        // Encrypt credentials
        const insertData: OltInsert = {
            ...data,
            snmp_community_encrypted: data.snmp_community ? encryptCredential(data.snmp_community) : null,
            api_username_encrypted: data.api_username ? encryptCredential(data.api_username) : null,
            api_password_encrypted: data.api_password ? encryptCredential(data.api_password) : null,
        };

        // Remove plain text fields
        delete (insertData as any).snmp_community;
        delete (insertData as any).api_username;
        delete (insertData as any).api_password;

        const { data: olt, error } = await supabase
            .from('olts')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return olt;
    },

    /**
     * Update an OLT
     */
    async update(id: string, data: OltUpdate & {
        snmp_community?: string;
        api_username?: string;
        api_password?: string;
    }): Promise<Olt> {
        const supabase = getServiceClient();

        const updateData: OltUpdate = { ...data };

        // Encrypt credentials if provided
        if (data.snmp_community) {
            updateData.snmp_community_encrypted = encryptCredential(data.snmp_community);
        }
        if (data.api_username) {
            updateData.api_username_encrypted = encryptCredential(data.api_username);
        }
        if (data.api_password) {
            updateData.api_password_encrypted = encryptCredential(data.api_password);
        }

        // Remove plain text fields
        delete (updateData as any).snmp_community;
        delete (updateData as any).api_username;
        delete (updateData as any).api_password;

        const { data: olt, error } = await supabase
            .from('olts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return olt;
    },

    /**
     * Delete an OLT
     */
    async delete(id: string): Promise<void> {
        const supabase = getServiceClient();

        const { error } = await supabase
            .from('olts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Update OLT status after polling
     */
    async updateStatus(id: string, status: Olt['status'], uptimeSeconds?: number, error?: string): Promise<void> {
        const supabase = getServiceClient();

        const updateData: Partial<Olt> = {
            status,
            last_polled_at: new Date().toISOString(),
        };

        if (uptimeSeconds !== undefined) {
            updateData.uptime_seconds = uptimeSeconds;
        }

        if (error) {
            updateData.last_error = error;
        } else {
            updateData.last_error = null;
        }

        await supabase.from('olts').update(updateData).eq('id', id);
    },

    /**
     * Get OLT with ports
     */
    async getWithPorts(id: string): Promise<OltWithPorts | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('olts')
            .select(`
        *,
        ports:olt_ports(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },
};

// ============================================
// OLT PORT OPERATIONS
// ============================================

export const oltPortApi = {
    /**
     * Get all ports for an OLT
     */
    async getByOlt(oltId: string): Promise<OltPort[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('olt_ports')
            .select('*')
            .eq('olt_id', oltId)
            .order('port_number');

        if (error) throw error;
        return data || [];
    },

    /**
     * Upsert ports (for discovery sync)
     */
    async upsertPorts(oltId: string, ports: OltPortInsert[]): Promise<OltPort[]> {
        const supabase = getServiceClient();

        const portsWithOlt = ports.map(p => ({ ...p, olt_id: oltId }));

        const { data, error } = await supabase
            .from('olt_ports')
            .upsert(portsWithOlt, { onConflict: 'olt_id,port_number' })
            .select();

        if (error) throw error;
        return data || [];
    },
};

// ============================================
// ONU OPERATIONS
// ============================================

export const onuApi = {
    /**
     * Get all ONUs for an OLT
     */
    async getByOlt(oltId: string): Promise<Onu[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('onus')
            .select('*')
            .eq('olt_id', oltId)
            .order('serial_number');

        if (error) throw error;
        return data || [];
    },

    /**
     * Get ONU by serial number
     */
    async getBySerial(serialNumber: string): Promise<Onu | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('onus')
            .select('*')
            .eq('serial_number', serialNumber)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },

    /**
     * Upsert ONUs (for discovery sync)
     */
    async upsertOnus(onus: OnuInsert[]): Promise<Onu[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('onus')
            .upsert(onus, { onConflict: 'olt_id,serial_number' })
            .select();

        if (error) throw error;
        return data || [];
    },

    /**
     * Update ONU status
     */
    async updateStatus(id: string, status: Onu['status'], opticalPower?: { rx: number; tx: number }): Promise<void> {
        const supabase = getServiceClient();

        const updateData: Partial<Onu> = {
            status,
            last_seen_at: new Date().toISOString(),
        };

        if (opticalPower) {
            updateData.rx_power = opticalPower.rx;
            updateData.tx_power = opticalPower.tx;
        }

        await supabase.from('onus').update(updateData).eq('id', id);
    },

    /**
     * Mark ONU as authorized
     */
    async authorize(id: string): Promise<void> {
        const supabase = getServiceClient();

        await supabase.from('onus').update({
            status: 'online',
            authorized_at: new Date().toISOString(),
        }).eq('id', id);
    },

    /**
     * Get unassigned ONUs (for provisioning queue)
     */
    async getUnassigned(workspaceId?: string): Promise<Onu[]> {
        const supabase = getServiceClient();

        let query = supabase
            .from('onus')
            .select(`
        *,
        olt:olts(workspace_id, name)
      `)
            .is('id', null) // No assignment
            .in('status', ['online', 'unauthorized']);

        if (workspaceId) {
            query = query.eq('olts.workspace_id', workspaceId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
    },
};

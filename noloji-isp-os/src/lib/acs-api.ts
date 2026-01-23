// ACS and Provisioning Supabase API
// Handles ACS devices, jobs, and device assignments

import { createClient } from '@supabase/supabase-js';
import {
    AcsDevice, AcsDeviceInsert,
    AcsJob, AcsJobInsert, AcsJobStatus, AcsJobType,
    ProvisioningProfile, ProvisioningProfileInsert,
    DeviceAssignment, DeviceAssignmentInsert, DeviceAssignmentStatus,
    AcsLog, AcsLogInsert
} from '@/types/olt-acs.types';

// Create service role client for backend operations
function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}

// ============================================
// ACS DEVICE OPERATIONS
// ============================================

export const acsDeviceApi = {
    /**
     * Get all ACS devices for a workspace
     */
    async getAll(workspaceId: string): Promise<AcsDevice[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('acs_devices')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('last_inform_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get device by serial number
     */
    async getBySerial(serialNumber: string): Promise<AcsDevice | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('acs_devices')
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
     * Register or update device from TR-069 Inform
     */
    async registerFromInform(inform: {
        serialNumber: string;
        oui: string;
        productClass: string;
        manufacturer: string;
        softwareVersion?: string;
        hardwareVersion?: string;
        connectionRequestUrl?: string;
        ip: string;
        workspaceId?: string;
    }): Promise<AcsDevice> {
        const supabase = getServiceClient();

        const deviceData: AcsDeviceInsert = {
            serial_number: inform.serialNumber,
            oui: inform.oui,
            product_class: inform.productClass,
            manufacturer: inform.manufacturer,
            software_version: inform.softwareVersion,
            hardware_version: inform.hardwareVersion,
            workspace_id: inform.workspaceId,
            status: 'online',
        };

        // Upsert based on serial number
        const { data, error } = await supabase
            .from('acs_devices')
            .upsert({
                ...deviceData,
                last_inform_at: new Date().toISOString(),
                last_inform_ip: inform.ip,
                connection_request_url: inform.connectionRequestUrl,
            }, { onConflict: 'serial_number' })
            .select()
            .single();

        if (error) throw error;

        // Log the inform event
        await acsLogApi.log({
            device_id: data.id,
            event_type: 'inform',
            event_data: { ip: inform.ip, oui: inform.oui },
            source_ip: inform.ip,
        });

        return data;
    },

    /**
     * Update device parameters
     */
    async updateParameters(id: string, parameters: Record<string, any>): Promise<void> {
        const supabase = getServiceClient();

        // Merge with existing parameters
        const { data: device } = await supabase
            .from('acs_devices')
            .select('parameters')
            .eq('id', id)
            .single();

        const mergedParams = { ...(device?.parameters || {}), ...parameters };

        await supabase
            .from('acs_devices')
            .update({ parameters: mergedParams })
            .eq('id', id);
    },

    /**
     * Get devices pending provisioning
     */
    async getPendingProvisioning(workspaceId?: string): Promise<AcsDevice[]> {
        const supabase = getServiceClient();

        let query = supabase
            .from('acs_devices')
            .select(`
        *,
        assignment:device_assignments(*)
      `)
            .eq('status', 'pending');

        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Filter to only unassigned devices
        return (data || []).filter(d => !d.assignment);
    },
};

// ============================================
// PROVISIONING PROFILE OPERATIONS
// ============================================

export const provisioningProfileApi = {
    /**
     * Get all profiles for a workspace
     */
    async getAll(workspaceId: string): Promise<ProvisioningProfile[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('provisioning_profiles')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    /**
     * Get default profile for a workspace
     */
    async getDefault(workspaceId: string): Promise<ProvisioningProfile | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('provisioning_profiles')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_default', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },

    /**
     * Create a new profile
     */
    async create(data: ProvisioningProfileInsert): Promise<ProvisioningProfile> {
        const supabase = getServiceClient();

        // If setting as default, unset other defaults
        if (data.is_default && data.workspace_id) {
            await supabase
                .from('provisioning_profiles')
                .update({ is_default: false })
                .eq('workspace_id', data.workspace_id);
        }

        const { data: profile, error } = await supabase
            .from('provisioning_profiles')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return profile;
    },

    /**
     * Update a profile
     */
    async update(id: string, data: Partial<ProvisioningProfileInsert>): Promise<ProvisioningProfile> {
        const supabase = getServiceClient();

        const { data: profile, error } = await supabase
            .from('provisioning_profiles')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return profile;
    },
};

// ============================================
// DEVICE ASSIGNMENT OPERATIONS
// ============================================

export const deviceAssignmentApi = {
    /**
     * Create assignment (link device to customer)
     */
    async create(data: DeviceAssignmentInsert): Promise<DeviceAssignment> {
        const supabase = getServiceClient();

        const { data: assignment, error } = await supabase
            .from('device_assignments')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return assignment;
    },

    /**
     * Get assignment by customer
     */
    async getByCustomer(customerId: string): Promise<DeviceAssignment | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('device_assignments')
            .select(`
        *,
        onu:onus(*),
        acs_device:acs_devices(*),
        profile:provisioning_profiles(*)
      `)
            .eq('customer_id', customerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },

    /**
     * Update assignment status
     */
    async updateStatus(id: string, status: DeviceAssignmentStatus, error?: string): Promise<void> {
        const supabase = getServiceClient();

        const update: Partial<DeviceAssignment> = { status };

        if (status === 'active') {
            update.last_provisioned_at = new Date().toISOString();
            update.last_error = null;
        }

        if (error) {
            update.last_error = error;
            update.provision_attempts = (await supabase
                .from('device_assignments')
                .select('provision_attempts')
                .eq('id', id)
                .single()).data?.provision_attempts + 1 || 1;
        }

        await supabase.from('device_assignments').update(update).eq('id', id);
    },

    /**
     * Auto-link by serial number
     */
    async autoLinkBySerial(serialNumber: string): Promise<DeviceAssignment | null> {
        const supabase = getServiceClient();

        // Check if there's a pre-registered assignment waiting for this serial
        // This would be set up when customer is created with expected device serial

        // For now, return null - future enhancement
        return null;
    },
};

// ============================================
// ACS JOB OPERATIONS
// ============================================

export const acsJobApi = {
    /**
     * Create a new job
     */
    async create(data: AcsJobInsert): Promise<AcsJob> {
        const supabase = getServiceClient();

        const { data: job, error } = await supabase
            .from('acs_jobs')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return job;
    },

    /**
     * Get pending jobs for a device
     */
    async getPendingForDevice(deviceId: string): Promise<AcsJob[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('acs_jobs')
            .select('*')
            .eq('device_id', deviceId)
            .in('status', ['pending', 'queued'])
            .order('priority')
            .order('scheduled_at');

        if (error) throw error;
        return data || [];
    },

    /**
     * Get next job to process
     */
    async getNextPending(): Promise<AcsJob | null> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('acs_jobs')
            .select(`
        *,
        device:acs_devices(*)
      `)
            .eq('status', 'pending')
            .lte('scheduled_at', new Date().toISOString())
            .order('priority')
            .order('scheduled_at')
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    },

    /**
     * Update job status
     */
    async updateStatus(id: string, status: AcsJobStatus, result?: any, errorMessage?: string): Promise<void> {
        const supabase = getServiceClient();

        const update: Partial<AcsJob> = { status };

        if (status === 'running') {
            update.started_at = new Date().toISOString();
        }

        if (status === 'completed' || status === 'failed') {
            update.completed_at = new Date().toISOString();
        }

        if (result) {
            update.result = result;
        }

        if (errorMessage) {
            update.error_message = errorMessage;
        }

        await supabase.from('acs_jobs').update(update).eq('id', id);
    },

    /**
     * Retry a failed job
     */
    async retry(id: string): Promise<void> {
        const supabase = getServiceClient();

        const { data: job } = await supabase
            .from('acs_jobs')
            .select('retry_count, max_retries')
            .eq('id', id)
            .single();

        if (job && job.retry_count < job.max_retries) {
            await supabase.from('acs_jobs').update({
                status: 'pending',
                retry_count: job.retry_count + 1,
                scheduled_at: new Date(Date.now() + 60000).toISOString(), // 1 min delay
            }).eq('id', id);
        }
    },

    /**
     * Queue common commands
     */
    async queueReboot(deviceId: string, createdBy?: string): Promise<AcsJob> {
        return this.create({
            device_id: deviceId,
            job_type: 'reboot',
            priority: 3,
            created_by: createdBy,
        });
    },

    async queueWifiConfig(deviceId: string, ssid: string, password: string, createdBy?: string): Promise<AcsJob> {
        return this.create({
            device_id: deviceId,
            job_type: 'wifi_config',
            priority: 5,
            parameters: { ssid, password },
            created_by: createdBy,
        });
    },

    async queueFirmwareUpgrade(deviceId: string, firmwareUrl: string, createdBy?: string): Promise<AcsJob> {
        return this.create({
            device_id: deviceId,
            job_type: 'firmware_upgrade',
            priority: 8,
            parameters: { url: firmwareUrl },
            created_by: createdBy,
        });
    },
};

// ============================================
// ACS LOG OPERATIONS
// ============================================

export const acsLogApi = {
    /**
     * Log an event
     */
    async log(data: AcsLogInsert): Promise<void> {
        const supabase = getServiceClient();

        await supabase.from('acs_logs').insert(data);
    },

    /**
     * Get logs for a device
     */
    async getByDevice(deviceId: string, limit: number = 50): Promise<AcsLog[]> {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from('acs_logs')
            .select('*')
            .eq('device_id', deviceId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },
};

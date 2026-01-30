/**
 * NOLOJIA LANDLORD ISP PLATFORM
 * MikroTik Enforcement Service
 *
 * This service handles all router enforcement operations:
 * - Enable/Disable PPPoE users based on payment status
 * - Update speed profiles
 * - Sync user status
 *
 * IMPORTANT: This service runs on the backend only.
 * Landlords NEVER have access to router credentials or direct control.
 */

import { supabase } from '@/lib/supabase';

// Types
interface RouterCredentials {
  id: string;
  name: string;
  ip_address: string;
  api_port: number;
  username: string;
  password: string;
  router_type: 'mikrotik' | 'ubiquiti' | 'cisco' | 'other';
}

interface EnforcementAction {
  id: string;
  customer_id: string;
  router_id: string;
  action: 'enable' | 'disable' | 'update_profile';
  payload: {
    pppoe_username?: string;
    profile_name?: string;
    reason?: string;
  };
}

interface EnforcementResult {
  success: boolean;
  action_id: string;
  error?: string;
  executed_at: string;
}

// RouterOS API client (simplified - in production use routeros-client package)
class RouterOSClient {
  private ip: string;
  private port: number;
  private username: string;
  private password: string;

  constructor(credentials: RouterCredentials) {
    this.ip = credentials.ip_address;
    this.port = credentials.api_port;
    this.username = credentials.username;
    this.password = credentials.password;
  }

  /**
   * Disable a PPPoE user (disconnect and prevent reconnection)
   */
  async disableUser(pppoeUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, use actual RouterOS API
      // This would be: /ppp/secret/disable [find name="username"]
      console.log(`[RouterOS] Disabling user: ${pppoeUsername} on ${this.ip}`);

      // Simulate API call
      // const response = await this.sendCommand(`/ppp/secret/disable`, { name: pppoeUsername });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable a PPPoE user (allow connection)
   */
  async enableUser(pppoeUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[RouterOS] Enabling user: ${pppoeUsername} on ${this.ip}`);

      // In production: /ppp/secret/enable [find name="username"]

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's speed profile
   */
  async updateProfile(pppoeUsername: string, profileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[RouterOS] Updating profile for ${pppoeUsername} to ${profileName} on ${this.ip}`);

      // In production: /ppp/secret/set [find name="username"] profile="profile_name"

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new PPPoE user
   */
  async createUser(
    pppoeUsername: string,
    password: string,
    profileName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[RouterOS] Creating user: ${pppoeUsername} with profile ${profileName} on ${this.ip}`);

      // In production: /ppp/secret/add name="username" password="password" profile="profile" service=pppoe

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a PPPoE user
   */
  async deleteUser(pppoeUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[RouterOS] Deleting user: ${pppoeUsername} on ${this.ip}`);

      // In production: /ppp/secret/remove [find name="username"]

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if router is reachable
   */
  async ping(): Promise<boolean> {
    try {
      // In production, attempt connection to RouterOS API
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Main Enforcement Service
 */
export class EnforcementService {
  private routerClients: Map<string, RouterOSClient> = new Map();

  /**
   * Get or create router client
   */
  private async getRouterClient(routerId: string): Promise<RouterOSClient | null> {
    if (this.routerClients.has(routerId)) {
      return this.routerClients.get(routerId)!;
    }

    // Fetch router credentials from database
    const { data: router, error } = await supabase
      .from('routers')
      .select('*')
      .eq('id', routerId)
      .single();

    if (error || !router) {
      console.error(`[Enforcement] Router ${routerId} not found`);
      return null;
    }

    // Decrypt credentials (in production, use proper encryption)
    const credentials: RouterCredentials = {
      id: router.id,
      name: router.name,
      ip_address: router.ip_address, // Would be decrypted
      api_port: router.api_port,
      username: router.username, // Would be decrypted
      password: router.password, // Would be decrypted
      router_type: router.router_type
    };

    const client = new RouterOSClient(credentials);
    this.routerClients.set(routerId, client);

    return client;
  }

  /**
   * Process a single enforcement action
   */
  async processAction(action: EnforcementAction): Promise<EnforcementResult> {
    const client = await this.getRouterClient(action.router_id);

    if (!client) {
      return {
        success: false,
        action_id: action.id,
        error: 'Router not found or unavailable',
        executed_at: new Date().toISOString()
      };
    }

    let result: { success: boolean; error?: string };

    switch (action.action) {
      case 'disable':
        result = await client.disableUser(action.payload.pppoe_username!);
        break;

      case 'enable':
        result = await client.enableUser(action.payload.pppoe_username!);
        break;

      case 'update_profile':
        result = await client.updateProfile(
          action.payload.pppoe_username!,
          action.payload.profile_name!
        );
        break;

      default:
        result = { success: false, error: 'Unknown action type' };
    }

    return {
      success: result.success,
      action_id: action.id,
      error: result.error,
      executed_at: new Date().toISOString()
    };
  }

  /**
   * Process all pending enforcement actions from queue
   */
  async processQueue(): Promise<{ processed: number; successful: number; failed: number }> {
    // Fetch pending actions
    const { data: actions, error } = await supabase
      .from('enforcement_queue')
      .select(`
        *,
        customer:customer_id(pppoe_username)
      `)
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !actions) {
      console.error('[Enforcement] Error fetching queue:', error);
      return { processed: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const action of actions) {
      // Mark as processing
      await supabase
        .from('enforcement_queue')
        .update({
          status: 'processing',
          attempts: action.attempts + 1
        })
        .eq('id', action.id);

      // Process the action
      const result = await this.processAction({
        ...action,
        payload: {
          ...action.payload,
          pppoe_username: action.customer?.pppoe_username
        }
      });

      // Update status based on result
      await supabase
        .from('enforcement_queue')
        .update({
          status: result.success ? 'completed' : (action.attempts + 1 >= 3 ? 'failed' : 'pending'),
          error_message: result.error,
          executed_at: result.success ? result.executed_at : null
        })
        .eq('id', action.id);

      // Update customer status if action was successful
      if (result.success) {
        successful++;

        if (action.action === 'enable') {
          await supabase
            .from('landlord_customers')
            .update({ status: 'active' })
            .eq('id', action.customer_id);
        } else if (action.action === 'disable') {
          await supabase
            .from('landlord_customers')
            .update({ status: 'suspended' })
            .eq('id', action.customer_id);
        }
      } else {
        failed++;
      }
    }

    return { processed: actions.length, successful, failed };
  }

  /**
   * Queue a disable action for a customer (e.g., non-payment)
   */
  async queueDisable(customerId: string, reason: string): Promise<void> {
    // Get customer and their building's router
    const { data: customer } = await supabase
      .from('landlord_customers')
      .select(`
        id,
        pppoe_username,
        unit:unit_id(
          building:building_id(
            router_assignments!inner(router_id)
          )
        )
      `)
      .eq('id', customerId)
      .single();

    // Access safely using any cast because types are inferred as arrays for joins
    const anyCustomer = customer as any;
    const routerId = anyCustomer?.unit?.[0]?.building?.[0]?.router_assignments?.[0]?.router_id ||
      anyCustomer?.unit?.building?.router_assignments?.[0]?.router_id;

    if (!routerId) {
      console.error('[Enforcement] Could not find router for customer:', customerId);
      return;
    }

    await supabase.from('enforcement_queue').insert({
      customer_id: customerId,
      router_id: routerId,
      action: 'disable',
      payload: { reason }
    });
  }

  /**
   * Queue an enable action for a customer (e.g., payment received)
   */
  async queueEnable(customerId: string): Promise<void> {
    const { data: customer } = await supabase
      .from('landlord_customers')
      .select(`
        id,
        pppoe_username,
        unit:unit_id(
          building:building_id(
            router_assignments!inner(router_id)
          )
        )
      `)
      .eq('id', customerId)
      .single();

    const anyCustomer = customer as any;
    const routerId = anyCustomer?.unit?.[0]?.building?.[0]?.router_assignments?.[0]?.router_id ||
      anyCustomer?.unit?.building?.router_assignments?.[0]?.router_id;

    if (!routerId) {
      console.error('[Enforcement] Could not find router for customer:', customerId);
      return;
    }

    await supabase.from('enforcement_queue').insert({
      customer_id: customerId,
      router_id: routerId,
      action: 'enable',
      payload: {}
    });
  }

  /**
   * Check for expired subscriptions and queue disable actions
   */
  async checkExpiredSubscriptions(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // Find active customers with expired subscriptions
    const { data: expiredCustomers } = await supabase
      .from('landlord_customers')
      .select(`
        id,
        name,
        subscription:subscriptions!inner(
          end_date,
          status
        )
      `)
      .eq('status', 'active')
      .eq('subscription.status', 'active')
      .lt('subscription.end_date', today);

    if (!expiredCustomers || expiredCustomers.length === 0) {
      return 0;
    }

    // Queue disable actions for each expired customer
    for (const customer of expiredCustomers) {
      await this.queueDisable(customer.id, 'Subscription expired');

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('customer_id', customer.id)
        .eq('status', 'active');
    }

    console.log(`[Enforcement] Queued ${expiredCustomers.length} disable actions for expired subscriptions`);
    return expiredCustomers.length;
  }
}

// Export singleton instance
export const enforcementService = new EnforcementService();

/**
 * API Route handler for processing enforcement queue
 * This would be called by a cron job every few minutes
 */
export async function processEnforcementQueue() {
  const result = await enforcementService.processQueue();
  console.log(`[Enforcement] Processed: ${result.processed}, Success: ${result.successful}, Failed: ${result.failed}`);
  return result;
}

/**
 * API Route handler for checking expired subscriptions
 * This would be called daily
 */
export async function checkExpiredSubscriptions() {
  const count = await enforcementService.checkExpiredSubscriptions();
  console.log(`[Enforcement] Found ${count} expired subscriptions`);
  return { expired_count: count };
}

/**
 * NOLOJIA LANDLORD ISP PLATFORM
 * Billing & Payment Service
 *
 * Handles:
 * - Payment processing (M-Pesa, Cash, Bank)
 * - Invoice generation
 * - Landlord payout calculations
 * - Revenue split (Landlord 70% / Nolojia 30%)
 */

import { supabase } from '@/lib/supabase';
import { enforcementService } from './enforcement-service';

// Types
interface PaymentData {
  customer_id: string;
  amount: number;
  payment_method: 'mpesa' | 'cash' | 'bank' | 'card';
  transaction_ref?: string;
  mpesa_receipt?: string;
  mpesa_phone?: string;
}

interface InvoiceData {
  customer_id: string;
  amount: number;
  due_date: string;
  subscription_id?: string;
}

interface PayoutData {
  landlord_id: string;
  period_start: string;
  period_end: string;
}

/**
 * Landlord Billing Service
 */
export class LandlordBillingService {
  /**
   * Process a payment for a landlord customer
   */
  async processPayment(paymentData: PaymentData): Promise<{
    success: boolean;
    payment_id?: string;
    error?: string;
  }> {
    try {
      // Get customer and landlord info
      const { data: customer, error: customerError } = await supabase
        .from('landlord_customers')
        .select(`
          id,
          landlord_id,
          name,
          status,
          subscription:subscriptions(
            id,
            package:package_id(price)
          ),
          landlord:landlord_id(
            commission_rate
          )
        `)
        .eq('id', paymentData.customer_id)
        .single();

      if (customerError || !customer) {
        throw new Error('Customer not found');
      }

      // Calculate revenue split
      const commissionRate = customer.landlord?.commission_rate || 30;
      const nolojiaShare = (paymentData.amount * commissionRate) / 100;
      const landlordShare = paymentData.amount - nolojiaShare;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('landlord_payments')
        .insert({
          customer_id: paymentData.customer_id,
          landlord_id: customer.landlord_id,
          subscription_id: customer.subscription?.[0]?.id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          transaction_ref: paymentData.transaction_ref,
          mpesa_receipt: paymentData.mpesa_receipt,
          mpesa_phone: paymentData.mpesa_phone,
          status: 'completed',
          paid_at: new Date().toISOString(),
          landlord_share: landlordShare,
          nolojia_share: nolojiaShare
        })
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      // If customer was suspended, enable them
      if (customer.status === 'suspended') {
        await enforcementService.queueEnable(customer.id);
      }

      // Extend subscription
      if (customer.subscription?.[0]?.id) {
        await this.extendSubscription(customer.subscription[0].id);
      }

      // Update any unpaid invoices
      await supabase
        .from('landlord_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_id: payment.id
        })
        .eq('customer_id', customer.id)
        .eq('status', 'unpaid');

      return {
        success: true,
        payment_id: payment.id
      };

    } catch (error: any) {
      console.error('[Billing] Payment processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extend a customer's subscription by one billing cycle
   */
  private async extendSubscription(subscriptionId: string): Promise<void> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        package:package_id(billing_cycle)
      `)
      .eq('id', subscriptionId)
      .single();

    if (!subscription) return;

    // Calculate new end date based on billing cycle
    const currentEnd = new Date(subscription.end_date);
    let newEnd: Date;

    switch (subscription.package?.billing_cycle) {
      case 'daily':
        newEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 1));
        break;
      case 'weekly':
        newEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 7));
        break;
      case 'monthly':
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
        break;
      case 'quarterly':
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 3));
        break;
      case 'yearly':
        newEnd = new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1));
        break;
      default:
        newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 1));
    }

    await supabase
      .from('subscriptions')
      .update({
        end_date: newEnd.toISOString().split('T')[0],
        status: 'active'
      })
      .eq('id', subscriptionId);
  }

  /**
   * Generate invoice for a customer
   */
  async generateInvoice(invoiceData: InvoiceData): Promise<{
    success: boolean;
    invoice_id?: string;
    invoice_number?: string;
    error?: string;
  }> {
    try {
      // Get customer's landlord
      const { data: customer } = await supabase
        .from('landlord_customers')
        .select('landlord_id')
        .eq('id', invoiceData.customer_id)
        .single();

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Generate invoice number
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const { count } = await supabase
        .from('landlord_invoices')
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `INV${yearMonth}%`);

      const invoiceNumber = `INV${yearMonth}${String((count || 0) + 1).padStart(5, '0')}`;

      // Create invoice
      const { data: invoice, error } = await supabase
        .from('landlord_invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: invoiceData.customer_id,
          landlord_id: customer.landlord_id,
          subscription_id: invoiceData.subscription_id,
          amount: invoiceData.amount,
          due_date: invoiceData.due_date,
          status: 'unpaid'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber
      };

    } catch (error: any) {
      console.error('[Billing] Invoice generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate invoices for all active subscriptions due for renewal
   */
  async generateMonthlyInvoices(): Promise<{ generated: number }> {
    const today = new Date();
    const dueDate = new Date(today.setDate(today.getDate() + 7)); // 7 days from now

    // Find subscriptions ending soon
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        id,
        customer_id,
        end_date,
        price_at_subscription,
        customer:customer_id(
          id,
          landlord_id,
          status
        )
      `)
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('end_date', dueDate.toISOString().split('T')[0]);

    if (!subscriptions || subscriptions.length === 0) {
      return { generated: 0 };
    }

    let generated = 0;

    for (const sub of subscriptions) {
      // Check if invoice already exists for this period
      const { count } = await supabase
        .from('landlord_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_id', sub.id)
        .eq('status', 'unpaid');

      if ((count || 0) > 0) continue; // Skip if unpaid invoice exists

      await this.generateInvoice({
        customer_id: sub.customer_id,
        amount: sub.price_at_subscription,
        due_date: sub.end_date,
        subscription_id: sub.id
      });

      generated++;
    }

    console.log(`[Billing] Generated ${generated} invoices`);
    return { generated };
  }

  /**
   * Calculate landlord payout for a period
   */
  async calculatePayout(payoutData: PayoutData): Promise<{
    total_revenue: number;
    commission_amount: number;
    payout_amount: number;
    payment_count: number;
  }> {
    const { data: payments } = await supabase
      .from('landlord_payments')
      .select('amount, landlord_share, nolojia_share')
      .eq('landlord_id', payoutData.landlord_id)
      .eq('status', 'completed')
      .gte('paid_at', payoutData.period_start)
      .lte('paid_at', payoutData.period_end);

    if (!payments || payments.length === 0) {
      return {
        total_revenue: 0,
        commission_amount: 0,
        payout_amount: 0,
        payment_count: 0
      };
    }

    const total_revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const payout_amount = payments.reduce((sum, p) => sum + (p.landlord_share || 0), 0);
    const commission_amount = payments.reduce((sum, p) => sum + (p.nolojia_share || 0), 0);

    return {
      total_revenue,
      commission_amount,
      payout_amount,
      payment_count: payments.length
    };
  }

  /**
   * Create a payout record for a landlord
   */
  async createPayoutRecord(payoutData: PayoutData): Promise<{
    success: boolean;
    payout_id?: string;
    error?: string;
  }> {
    try {
      // Calculate totals
      const totals = await this.calculatePayout(payoutData);

      if (totals.total_revenue === 0) {
        return {
          success: false,
          error: 'No payments found for this period'
        };
      }

      // Create payout record
      const { data: payout, error } = await supabase
        .from('landlord_payouts')
        .insert({
          landlord_id: payoutData.landlord_id,
          period_start: payoutData.period_start,
          period_end: payoutData.period_end,
          total_revenue: totals.total_revenue,
          commission_amount: totals.commission_amount,
          payout_amount: totals.payout_amount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        payout_id: payout.id
      };

    } catch (error: any) {
      console.error('[Billing] Payout creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate payouts for all landlords for the previous month
   */
  async generateMonthlyPayouts(): Promise<{ generated: number; total_amount: number }> {
    // Calculate previous month's dates
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const periodStart = firstDayLastMonth.toISOString().split('T')[0];
    const periodEnd = lastDayLastMonth.toISOString().split('T')[0];

    // Get all active landlords
    const { data: landlords } = await supabase
      .from('landlords')
      .select('id')
      .eq('is_active', true);

    if (!landlords || landlords.length === 0) {
      return { generated: 0, total_amount: 0 };
    }

    let generated = 0;
    let total_amount = 0;

    for (const landlord of landlords) {
      // Check if payout already exists for this period
      const { count } = await supabase
        .from('landlord_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlord.id)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd);

      if ((count || 0) > 0) continue;

      const result = await this.createPayoutRecord({
        landlord_id: landlord.id,
        period_start: periodStart,
        period_end: periodEnd
      });

      if (result.success && result.payout_id) {
        generated++;

        // Get payout amount
        const { data: payout } = await supabase
          .from('landlord_payouts')
          .select('payout_amount')
          .eq('id', result.payout_id)
          .single();

        total_amount += payout?.payout_amount || 0;
      }
    }

    console.log(`[Billing] Generated ${generated} payouts totaling KES ${total_amount}`);
    return { generated, total_amount };
  }

  /**
   * Mark overdue invoices
   */
  async markOverdueInvoices(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data: updated } = await supabase
      .from('landlord_invoices')
      .update({ status: 'overdue' })
      .eq('status', 'unpaid')
      .lt('due_date', today)
      .select();

    const count = updated?.length || 0;

    if (count > 0) {
      console.log(`[Billing] Marked ${count} invoices as overdue`);
    }

    return count;
  }
}

// Export singleton instance
export const landlordBillingService = new LandlordBillingService();

/**
 * M-Pesa Callback Handler
 * Called when M-Pesa sends payment confirmation
 */
export async function handleMpesaCallback(payload: {
  ResultCode: number;
  ResultDesc: string;
  MpesaReceiptNumber: string;
  TransactionDate: string;
  PhoneNumber: string;
  Amount: number;
  customer_id: string;
}): Promise<{ success: boolean }> {
  if (payload.ResultCode !== 0) {
    console.log('[M-Pesa] Payment failed:', payload.ResultDesc);
    return { success: false };
  }

  const result = await landlordBillingService.processPayment({
    customer_id: payload.customer_id,
    amount: payload.Amount,
    payment_method: 'mpesa',
    mpesa_receipt: payload.MpesaReceiptNumber,
    mpesa_phone: payload.PhoneNumber,
    transaction_ref: payload.MpesaReceiptNumber
  });

  return { success: result.success };
}

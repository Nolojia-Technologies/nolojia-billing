// ============================================================================
// NOLOJIA LANDLORD ISP PLATFORM - TypeScript Types
// ============================================================================

// Enums matching database
export type OrganizationType = 'nolojia' | 'full_isp' | 'landlord';
export type OrganizationStatus = 'active' | 'suspended' | 'pending';
export type UserRole = 'super_admin' | 'nolojia_staff' | 'full_isp' | 'landlord_admin' | 'landlord_staff';
export type PayoutMethod = 'mpesa' | 'bank' | 'cheque';
export type UnitType = 'apartment' | 'shop' | 'office' | 'house';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';
export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type CustomerStatus = 'active' | 'suspended' | 'disconnected' | 'pending';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'mpesa' | 'cash' | 'bank' | 'card';
export type RouterType = 'mikrotik' | 'ubiquiti' | 'cisco' | 'other';
export type RouterStatus = 'online' | 'offline' | 'maintenance' | 'unknown';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Core Interfaces
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  settings: Record<string, any>;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Landlord {
  id: string;
  organization_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country: string;
  payout_method: PayoutMethod;
  payout_details: PayoutDetails;
  commission_rate: number;
  is_active: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization;
}

export interface PayoutDetails {
  mpesa_phone?: string;
  mpesa_name?: string;
  bank_name?: string;
  bank_account?: string;
  bank_branch?: string;
}

export interface LandlordBuilding {
  id: string;
  landlord_id: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  total_units: number;
  status: OrganizationStatus;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  landlord?: Landlord;
  units?: Unit[];
  // Computed
  occupied_units?: number;
  active_customers?: number;
}

export interface Unit {
  id: string;
  building_id: string;
  unit_number: string;
  floor?: number;
  type: UnitType;
  status: UnitStatus;
  description?: string;
  monthly_rent?: number;
  created_at: string;
  updated_at: string;
  // Relations
  building?: LandlordBuilding;
  customer?: LandlordCustomer;
}

export interface LandlordPackage {
  id: string;
  organization_id?: string;
  landlord_id?: string;
  name: string;
  description?: string;
  speed_mbps: number;
  price: number;
  billing_cycle: BillingCycle;
  router_profile?: string;
  burst_limit_mbps?: number;
  burst_threshold_mbps?: number;
  burst_time_seconds?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LandlordCustomer {
  id: string;
  landlord_id: string;
  unit_id?: string;
  name: string;
  phone?: string;
  email?: string;
  national_id?: string;
  pppoe_username?: string;
  status: CustomerStatus;
  status_reason?: string;
  mac_address?: string;
  ip_address?: string;
  last_online?: string;
  created_at: string;
  updated_at: string;
  // Relations
  landlord?: Landlord;
  unit?: Unit;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  customer_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  auto_renew: boolean;
  price_at_subscription: number;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: LandlordCustomer;
  package?: LandlordPackage;
}

export interface LandlordPayment {
  id: string;
  subscription_id?: string;
  customer_id: string;
  landlord_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  mpesa_receipt?: string;
  mpesa_phone?: string;
  status: PaymentStatus;
  status_reason?: string;
  paid_at?: string;
  landlord_share?: number;
  nolojia_share?: number;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: LandlordCustomer;
  subscription?: Subscription;
}

export interface LandlordInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  landlord_id: string;
  subscription_id?: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  paid_at?: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: LandlordCustomer;
  payment?: LandlordPayment;
}

export interface LandlordPayout {
  id: string;
  landlord_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  commission_amount: number;
  payout_amount: number;
  status: PayoutStatus;
  payout_method?: PayoutMethod;
  payout_reference?: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Nolojia Admin Types (not visible to landlords)
// ============================================================================

export interface Router {
  id: string;
  name: string;
  ip_address: string; // Encrypted in DB
  api_port: number;
  api_ssl_port?: number;
  username: string; // Encrypted in DB
  password: string; // Encrypted in DB
  router_type: RouterType;
  model?: string;
  serial_number?: string;
  status: RouterStatus;
  last_seen?: string;
  last_error?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface RouterAssignment {
  id: string;
  router_id: string;
  building_id: string;
  assigned_by?: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  router?: Router;
  building?: LandlordBuilding;
}

export interface EnforcementQueueItem {
  id: string;
  customer_id: string;
  router_id: string;
  action: 'enable' | 'disable' | 'update_profile';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  executed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  organization_id?: string;
  landlord_id?: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // Relations
  organization?: Organization;
  landlord?: Landlord;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Relations
  user?: User;
}

// ============================================================================
// Dashboard & Analytics Types
// ============================================================================

export interface LandlordDashboardSummary {
  landlord_id: string;
  contact_name: string;
  total_buildings: number;
  total_units: number;
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  revenue_this_month: number;
  earnings_this_month: number;
}

export interface BuildingOccupancy {
  building_id: string;
  landlord_id: string;
  building_name: string;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  active_connections: number;
}

export interface MonthlyRevenue {
  month: string;
  total_revenue: number;
  landlord_share: number;
  nolojia_share: number;
  payment_count: number;
}

export interface CustomerPaymentStatus {
  customer_id: string;
  customer_name: string;
  unit_number: string;
  building_name: string;
  package_name: string;
  subscription_status: SubscriptionStatus;
  last_payment_date?: string;
  next_due_date: string;
  amount_due: number;
  is_overdue: boolean;
}

// ============================================================================
// Form Input Types
// ============================================================================

export interface CreateLandlordInput {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  country?: string;
  commission_rate?: number;
}

export interface CreateBuildingInput {
  landlord_id: string;
  name: string;
  address?: string;
  city?: string;
  total_units: number;
  generate_units?: boolean;
  unit_prefix?: string;
}

export interface CreateUnitInput {
  building_id: string;
  unit_number: string;
  floor?: number;
  type?: UnitType;
  description?: string;
  monthly_rent?: number;
}

export interface CreateCustomerInput {
  landlord_id: string;
  unit_id?: string;
  name: string;
  phone?: string;
  email?: string;
  national_id?: string;
  package_id: string;
}

export interface CreatePaymentInput {
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  mpesa_receipt?: string;
  mpesa_phone?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// M-Pesa STK Push Types
// ============================================================================

export type STKTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface STKPushRequest {
  customer_id: string;
  phone_number: string;
  amount: number;
  account_reference?: string;
}

export interface STKPushResponse {
  success: boolean;
  checkout_request_id?: string;
  merchant_request_id?: string;
  customer_message?: string;
  error?: string;
}

export interface MPesaSTKTransaction {
  id: string;
  customer_id: string;
  landlord_id: string;
  phone_number: string;
  amount: number;
  checkout_request_id?: string;
  merchant_request_id?: string;
  mpesa_receipt_number?: string;
  result_code?: number;
  result_description?: string;
  status: STKTransactionStatus;
  payment_id?: string;
  created_at: string;
  completed_at?: string;
}

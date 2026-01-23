import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Landlord,
  LandlordBuilding,
  Unit,
  LandlordCustomer,
  LandlordPayment,
  LandlordPackage,
  LandlordPayout,
  LandlordDashboardSummary,
  BuildingOccupancy,
  CustomerPaymentStatus,
  User,
  UserRole,
  CreateBuildingInput,
  CreateCustomerInput
} from '@/types/landlord';

// ============================================================================
// Authentication & User Context Hook
// ============================================================================

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        // Use API route to bypass RLS issues
        const response = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser.id }),
        });

        const data = await response.json();

        if (data.profile) {
          setUser(data.profile as User);
        } else {
          // Fallback if no profile found
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            role: 'landlord_admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  const isNolojiaAdmin = user?.role === 'super_admin' || user?.role === 'nolojia_staff';
  const isLandlord = user?.role === 'landlord_admin' || user?.role === 'landlord_staff';
  const isLandlordAdmin = user?.role === 'landlord_admin';

  return { user, loading, error, isNolojiaAdmin, isLandlord, isLandlordAdmin };
}

// ============================================================================
// Landlord Dashboard Hook
// ============================================================================

export function useLandlordDashboard() {
  const [summary, setSummary] = useState<LandlordDashboardSummary | null>(null);
  const [buildings, setBuildings] = useState<BuildingOccupancy[]>([]);
  const [recentPayments, setRecentPayments] = useState<LandlordPayment[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<CustomerPaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch dashboard summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('landlord_dashboard_summary')
        .select('*')
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') throw summaryError;
      setSummary(summaryData);

      // Fetch building occupancy
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('building_occupancy')
        .select('*');

      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      // Fetch recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('landlord_payments')
        .select(`
          *,
          customer:customer_id(name, phone)
        `)
        .eq('status', 'completed')
        .order('paid_at', { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;
      setRecentPayments(paymentsData || []);

      // Fetch customer payment statuses (who's paid, who hasn't)
      const { data: statusData, error: statusError } = await supabase
        .from('landlord_customers')
        .select(`
          id,
          name,
          status,
          unit:unit_id(
            unit_number,
            building:building_id(name)
          ),
          subscription:subscriptions(
            end_date,
            status,
            package:package_id(name, price)
          )
        `)
        .order('name');

      if (statusError) throw statusError;

      // Transform to CustomerPaymentStatus format
      const statuses: CustomerPaymentStatus[] = (statusData || []).map((c: any) => ({
        customer_id: c.id,
        customer_name: c.name,
        unit_number: c.unit?.unit_number || 'N/A',
        building_name: c.unit?.building?.name || 'N/A',
        package_name: c.subscription?.[0]?.package?.name || 'No package',
        subscription_status: c.subscription?.[0]?.status || 'pending',
        next_due_date: c.subscription?.[0]?.end_date || '',
        amount_due: c.subscription?.[0]?.package?.price || 0,
        is_overdue: c.subscription?.[0]?.status === 'expired'
      }));

      setPaymentStatuses(statuses);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    summary,
    buildings,
    recentPayments,
    paymentStatuses,
    loading,
    error,
    refresh: fetchDashboard
  };
}

// ============================================================================
// Landlord Buildings Hook
// ============================================================================

export function useLandlordBuildings() {
  const [buildings, setBuildings] = useState<LandlordBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_buildings')
        .select(`
          *,
          units(
            id,
            unit_number,
            status,
            customer:landlord_customers(
              id,
              name,
              status
            )
          )
        `)
        .order('name');

      if (error) throw error;

      // Calculate occupancy stats
      const buildingsWithStats = (data || []).map((b: any) => ({
        ...b,
        occupied_units: b.units?.filter((u: any) => u.status === 'occupied').length || 0,
        active_customers: b.units?.filter((u: any) => u.customer?.status === 'active').length || 0
      }));

      setBuildings(buildingsWithStats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  return { buildings, loading, error, refresh: fetchBuildings };
}

// ============================================================================
// Building Units Hook
// ============================================================================

export function useBuildingUnits(buildingId: string | null) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    if (!buildingId) {
      setUnits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          customer:landlord_customers(
            id,
            name,
            phone,
            status,
            subscription:subscriptions(
              status,
              end_date,
              package:package_id(name, price)
            )
          )
        `)
        .eq('building_id', buildingId)
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return { units, loading, error, refresh: fetchUnits };
}

// ============================================================================
// Landlord Customers Hook
// ============================================================================

export function useLandlordCustomers(filters?: { status?: string; building_id?: string; search?: string }) {
  const [customers, setCustomers] = useState<LandlordCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('landlord_customers')
        .select(`
          *,
          unit:unit_id(
            unit_number,
            building:building_id(id, name)
          ),
          subscription:subscriptions(
            id,
            status,
            start_date,
            end_date,
            package:package_id(name, price, speed_mbps)
          )
        `)
        .order('name');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Note: building_id filter via nested relation doesn't work in Supabase
      // We'll filter client-side after fetching

      const { data, error } = await query;

      if (error) throw error;

      // Client-side filtering for building_id (Bug fix #1)
      let filteredData = data || [];
      if (filters?.building_id) {
        filteredData = filteredData.filter((c: any) =>
          c.unit?.building?.id === filters.building_id
        );
      }

      // Client-side search filtering
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((c: any) =>
          c.name?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(filters.search) ||
          c.unit?.unit_number?.toLowerCase().includes(searchLower)
        );
      }

      setCustomers(filteredData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.building_id, filters?.search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, error, refresh: fetchCustomers };
}

// ============================================================================
// Landlord Payments Hook
// ============================================================================

export function useLandlordPayments(filters?: {
  status?: string;
  from_date?: string;
  to_date?: string;
  building_id?: string;
  search?: string;
}) {
  const [payments, setPayments] = useState<LandlordPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_amount: 0,
    landlord_total: 0,
    count: 0
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('landlord_payments')
        .select(`
          *,
          customer:customer_id(
            name,
            phone,
            unit:unit_id(
              unit_number,
              building:building_id(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Bug fix #2: Client-side filter for building_id
      let filteredData = data || [];
      if (filters?.building_id) {
        filteredData = filteredData.filter((p: any) =>
          p.customer?.unit?.building?.id === filters.building_id
        );
      }

      // Client-side search filtering
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((p: any) =>
          p.customer?.name?.toLowerCase().includes(searchLower) ||
          p.transaction_ref?.toLowerCase().includes(searchLower) ||
          p.mpesa_receipt?.toLowerCase().includes(searchLower) ||
          p.customer?.unit?.unit_number?.toLowerCase().includes(searchLower)
        );
      }

      const completedPayments = filteredData.filter((p: any) => p.status === 'completed');
      setPayments(filteredData);
      setStats({
        total_amount: completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        landlord_total: completedPayments.reduce((sum: number, p: any) => sum + (p.landlord_share || 0), 0),
        count: completedPayments.length
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.from_date, filters?.to_date, filters?.building_id, filters?.search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, stats, loading, error, refresh: fetchPayments };
}

// ============================================================================
// Packages Hook
// ============================================================================

export function useLandlordPackages() {
  const [packages, setPackages] = useState<LandlordPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('price');

      if (error) throw error;
      setPackages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return { packages, loading, error, refresh: fetchPackages };
}

// ============================================================================
// Landlord Profile Hook
// ============================================================================

export function useLandlordProfile() {
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's landlord_id via API to bypass RLS
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Use API route to get profile (bypasses RLS)
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      });

      const profileData = await response.json();

      if (!profileData.profile?.landlord_id) {
        throw new Error('No landlord associated with this user');
      }

      const { data, error } = await supabase
        .from('landlords')
        .select('*, organization:organization_id(*)')
        .eq('id', profileData.profile.landlord_id)
        .single();

      if (error) throw error;
      setLandlord(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Bug fix #3: Remove fetchProfile from dependencies, use optimistic update
  const updateProfile = useCallback(async (updates: Partial<Landlord>) => {
    if (!landlord?.id) return { error: 'No landlord loaded' };

    setUpdating(true);
    // Optimistic update
    const previousLandlord = landlord;
    setLandlord({ ...landlord, ...updates } as Landlord);

    try {
      const { error } = await supabase
        .from('landlords')
        .update(updates)
        .eq('id', landlord.id);

      if (error) throw error;

      setUpdating(false);
      return { error: null };
    } catch (err: any) {
      // Rollback on error
      setLandlord(previousLandlord);
      setUpdating(false);
      return { error: err.message };
    }
  }, [landlord?.id]); // Only depend on landlord.id, not the whole object or fetchProfile

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { landlord, loading, error, updating, refresh: fetchProfile, updateProfile };
}

// ============================================================================
// Landlord Payouts Hook
// ============================================================================

// Bug fix #4: Properly typed payouts
export function useLandlordPayouts() {
  const [payouts, setPayouts] = useState<LandlordPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_payouts')
        .select('*')
        .order('period_end', { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  return { payouts, loading, error, refresh: fetchPayouts };
}

// ============================================================================
// CRUD Operations - Buildings
// ============================================================================

export function useBuildingMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBuilding = useCallback(async (input: CreateBuildingInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: building, error: buildingError } = await supabase
        .from('landlord_buildings')
        .insert({
          landlord_id: input.landlord_id,
          name: input.name,
          address: input.address,
          city: input.city,
          total_units: input.total_units,
          status: 'active'
        })
        .select()
        .single();

      if (buildingError) throw buildingError;

      // Optionally generate units
      if (input.generate_units && input.total_units > 0) {
        const prefix = input.unit_prefix || '';
        const units = Array.from({ length: input.total_units }, (_, i) => ({
          building_id: building.id,
          unit_number: `${prefix}${String(i + 1).padStart(3, '0')}`,
          status: 'vacant',
          type: 'apartment'
        }));

        const { error: unitsError } = await supabase
          .from('units')
          .insert(units);

        if (unitsError) throw unitsError;
      }

      setLoading(false);
      return { data: building, error: null };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return { data: null, error: err.message };
    }
  }, []);

  const updateBuilding = useCallback(async (id: string, updates: Partial<LandlordBuilding>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_buildings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLoading(false);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return { data: null, error: err.message };
    }
  }, []);

  return { createBuilding, updateBuilding, loading, error };
}

// ============================================================================
// CRUD Operations - Customers
// ============================================================================

export function useCustomerMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCallback(async (input: CreateCustomerInput) => {
    setLoading(true);
    setError(null);

    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('landlord_customers')
        .insert({
          landlord_id: input.landlord_id,
          unit_id: input.unit_id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          national_id: input.national_id,
          status: 'pending'
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create subscription if package specified
      if (input.package_id) {
        // Get package price
        const { data: pkg } = await supabase
          .from('landlord_packages')
          .select('price')
          .eq('id', input.package_id)
          .single();

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            customer_id: customer.id,
            package_id: input.package_id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'pending',
            auto_renew: true,
            price_at_subscription: pkg?.price || 0
          });

        if (subError) throw subError;
      }

      // Update unit status if assigned
      if (input.unit_id) {
        await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', input.unit_id);
      }

      setLoading(false);
      return { data: customer, error: null };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return { data: null, error: err.message };
    }
  }, []);

  const updateCustomerStatus = useCallback(async (
    customerId: string,
    status: 'active' | 'suspended' | 'disconnected',
    reason?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_customers')
        .update({
          status,
          status_reason: reason || null
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;

      setLoading(false);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return { data: null, error: err.message };
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<LandlordCustomer>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('landlord_customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLoading(false);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return { data: null, error: err.message };
    }
  }, []);

  return { createCustomer, updateCustomerStatus, updateCustomer, loading, error };
}

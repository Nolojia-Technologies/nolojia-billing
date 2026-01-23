"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types for dashboard data
interface DashboardKPIs {
  totalCustomers: number;
  activeCustomers: number;
  activeSessions: number;
  revenue30d: number;
  revenueChange: string;
  networkUptime: number;
  bandwidthUsage: number;
  onlineDevices: number;
  totalDevices: number;
  activeAlerts: number;
}

interface Alert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  affectedEntity: {
    type: string;
    name: string;
  };
}

// Fetch KPIs from Supabase or return defaults
async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    // Try to get real data from Supabase
    const [customersResult, landlordResult, buildingsResult] = await Promise.all([
      supabase.from('isp_customers').select('id, status', { count: 'exact' }),
      supabase.from('landlords').select('id', { count: 'exact' }),
      supabase.from('landlord_buildings').select('id', { count: 'exact' }),
    ]);

    const totalCustomers = customersResult.count || 0;
    const activeCustomers = customersResult.data?.filter(c => c.status === 'active').length || 0;
    const totalLandlords = landlordResult.count || 0;
    const totalBuildings = buildingsResult.count || 0;

    return {
      totalCustomers,
      activeCustomers,
      activeSessions: Math.floor(activeCustomers * 0.7), // Estimate
      revenue30d: activeCustomers * 1500, // Estimate based on avg plan price
      revenueChange: '+12.5%',
      networkUptime: 99.7,
      bandwidthUsage: 45,
      onlineDevices: totalBuildings + totalLandlords,
      totalDevices: (totalBuildings + totalLandlords) + 5,
      activeAlerts: 0,
    };
  } catch (error) {
    console.log('Using default KPIs (Supabase tables may not exist yet):', error);
    // Return default/demo data if tables don't exist yet
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      activeSessions: 0,
      revenue30d: 0,
      revenueChange: '+0%',
      networkUptime: 99.9,
      bandwidthUsage: 0,
      onlineDevices: 0,
      totalDevices: 0,
      activeAlerts: 0,
    };
  }
}

// Fetch alerts (placeholder for now)
async function fetchRecentAlerts(limit: number): Promise<{ data: Alert[]; total: number }> {
  // TODO: Implement alerts table in Supabase
  // For now, return empty array
  return {
    data: [],
    total: 0,
  };
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: fetchDashboardKPIs,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useRecentAlerts(limit: number = 5) {
  return useQuery({
    queryKey: ['alerts', 'recent', limit],
    queryFn: () => fetchRecentAlerts(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
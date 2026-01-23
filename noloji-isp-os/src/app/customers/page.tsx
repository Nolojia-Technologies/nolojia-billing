'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { supabaseCustomerApi, supabasePlanApi } from '@/lib/supabase-api';
import { CustomerActions } from '@/components/mikrotik/CustomerActions';
import { toast } from '@/components/ui/use-toast';
import {
  Users, Search, Plus, UserCheck, UserX,
  Wifi, Cable, Calendar, Package, RefreshCw, Download, Trash2, Radio, CheckSquare, Square
} from 'lucide-react';

const SYNC_INTERVAL = 30000; // 30 seconds

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HOTSPOT' | 'PPPOE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [bulkPlanId, setBulkPlanId] = useState('');
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Real-time sync state
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [, setTick] = useState(0); // Force re-render for time display
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update time display every 10 seconds
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(tickInterval);
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await supabaseCustomerApi.getAll({
        limit: 100,
        search: searchTerm || undefined,
      });

      let filtered = response.data;
      if (filter !== 'ALL') {
        filtered = filtered.filter(c =>
          c.connection_type?.toUpperCase() === filter
        );
      }

      setCustomers(filtered);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load customers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  // Sync online status - silent mode for auto-sync
  const syncOnlineStatus = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setSyncing(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/sync-online-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setLastSyncTime(new Date());
        if (!silent) {
          toast({
            title: 'Status Synced',
            description: result.message
          });
        }
        await loadCustomers(); // Reload to show updated status
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error: any) {
      if (!silent) {
        toast({
          title: 'Sync Failed',
          description: error.message || 'Could not connect to MikroTik service',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  }, [loadCustomers]);

  // Initial load
  useEffect(() => {
    loadCustomers();
    loadPackages();
  }, [loadCustomers]);

  const loadPackages = async () => {
    try {
      const data = await supabasePlanApi.getAll();
      setPackages(data || []);
    } catch (error) {
      console.error('Failed to load packages');
    }
  };

  // Bulk selection helpers
  const toggleSelectCustomer = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBulkPanel(newSelected.size > 0);
  };

  const selectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
      setShowBulkPanel(false);
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)));
      setShowBulkPanel(true);
    }
  };

  const handleBulkUpdatePlan = async () => {
    if (!bulkPlanId || selectedIds.size === 0) return;

    try {
      setBulkUpdating(true);
      const { error } = await supabase
        .from('customers')
        .update({ plan_id: parseInt(bulkPlanId) })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated plan for ${selectedIds.size} customers`
      });
      setSelectedIds(new Set());
      setShowBulkPanel(false);
      loadCustomers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkUpdateExpiry = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBulkUpdating(true);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + bulkDays);
      expiryDate.setHours(23, 59, 0, 0);

      const { error } = await supabase
        .from('customers')
        .update({ valid_until: expiryDate.toISOString() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated expiry for ${selectedIds.size} customers (+${bulkDays} days)`
      });
      setSelectedIds(new Set());
      setShowBulkPanel(false);
      loadCustomers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setBulkUpdating(false);
    }
  };

  // Auto-sync interval
  useEffect(() => {
    // Initial sync
    if (autoSync) {
      syncOnlineStatus(true);
    }

    // Set up interval for auto-sync
    if (autoSync) {
      syncIntervalRef.current = setInterval(() => {
        syncOnlineStatus(true);
      }, SYNC_INTERVAL);
    }

    // Cleanup
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, syncOnlineStatus]);

  const handleSearch = () => {
    loadCustomers();
  };

  const getActivityStatus = (customer: any) => {
    return customer.is_online ? 'Online' : 'Offline';
  };

  const getAccountStatus = (customer: any) => {
    if (!customer.is_active) return 'Inactive';
    if (customer.status === 'EXPIRED') return 'Expired';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `${diffMinutes}m ago`;
  };

  const filterStats = {
    all: customers.length,
    hotspot: customers.filter(c => c.connection_type === 'HOTSPOT').length,
    pppoe: customers.filter(c => c.connection_type === 'PPPOE').length,
    online: customers.filter(c => c.is_online).length
  };

  const importFromMikroTik = async () => {
    try {
      setImporting(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/import-from-mikrotik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        // Build detailed message showing profiles
        let detailMessage = result.message;
        if (result.imported && result.imported.length > 0) {
          const profileGroups = result.imported.reduce((acc: any, user: any) => {
            const profile = user.mikrotik_profile || 'No Profile';
            if (!acc[profile]) acc[profile] = 0;
            acc[profile]++;
            return acc;
          }, {});
          const profileSummary = Object.entries(profileGroups)
            .map(([profile, count]) => `${profile}: ${count}`)
            .join(', ');
          detailMessage = `${result.message}. Profiles: ${profileSummary}`;
        }
        toast({
          title: 'Import Complete',
          description: detailMessage
        });
        loadCustomers(); // Reload to show imported users
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not connect to MikroTik service',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your ISP customers</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Live Status Indicator */}
          <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoSync ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">{autoSync ? 'Live' : 'Paused'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {lastSyncTime ? `Updated ${formatLastSyncTime()}` : 'Not synced'}
            </div>
            <div className="flex items-center gap-2 border-l pl-3">
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
              <Label htmlFor="auto-sync" className="text-xs cursor-pointer">Auto</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={importFromMikroTik} disabled={importing}>
              <Download className={`w-4 h-4 mr-2 ${importing ? 'animate-pulse' : ''}`} />
              {importing ? 'Importing...' : 'Import from MikroTik'}
            </Button>
            <Button variant="outline" onClick={() => syncOnlineStatus(false)} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Status'}
            </Button>
            <Button onClick={() => router.push('/customers/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.all}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Hotspot</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.hotspot}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">PPPOE</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.pppoe}</div>
        </Card>

        <Card className={`p-4 ${autoSync ? 'ring-1 ring-green-500/30' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Online Now</span>
            </div>
            {autoSync && (
              <div className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-green-600">{filterStats.online}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={filter === 'HOTSPOT' ? 'default' : 'outline'}
              onClick={() => setFilter('HOTSPOT')}
            >
              <Wifi className="w-4 h-4 mr-1" />
              Hotspot
            </Button>
            <Button
              variant={filter === 'PPPOE' ? 'default' : 'outline'}
              onClick={() => setFilter('PPPOE')}
            >
              <Cable className="w-4 h-4 mr-1" />
              PPPOE
            </Button>
          </div>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by name, username, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Panel */}
      {showBulkPanel && (
        <Card className="p-4 mb-6 border-2 border-primary bg-primary/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">{selectedIds.size} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Assign Plan:</Label>
              <select
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={bulkPlanId}
                onChange={(e) => setBulkPlanId(e.target.value)}
              >
                <option value="">Select plan...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleBulkUpdatePlan} disabled={!bulkPlanId || bulkUpdating}>
                Apply
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Set Expiry:</Label>
              <select
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={bulkDays}
                onChange={(e) => setBulkDays(parseInt(e.target.value))}
              >
                <option value={7}>+7 days</option>
                <option value={30}>+30 days</option>
                <option value={90}>+90 days</option>
                <option value={365}>+1 year</option>
              </select>
              <Button size="sm" onClick={handleBulkUpdateExpiry} disabled={bulkUpdating}>
                Apply
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setShowBulkPanel(false); }}>
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-8">Loading customers...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background z-10 shadow-sm">
                <tr className="border-b">
                  <th className="w-10 p-4 bg-background">
                    <button onClick={selectAll} className="hover:text-primary">
                      {selectedIds.size === customers.length && customers.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium bg-background">Username</th>
                  <th className="text-left p-4 font-medium bg-background">Name</th>
                  <th className="text-left p-4 font-medium bg-background">Phone</th>
                  <th className="text-left p-4 font-medium bg-background">Type</th>
                  <th className="text-left p-4 font-medium bg-background">Activity</th>
                  <th className="text-left p-4 font-medium bg-background">Status</th>
                  <th className="text-left p-4 font-medium bg-background">Package</th>
                  <th className="text-left p-4 font-medium bg-background">Expiry</th>
                  <th className="text-left p-4 font-medium bg-background">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`border-b hover:bg-primary/10 cursor-pointer transition-colors duration-150 ${selectedIds.has(customer.id) ? 'bg-primary/10' : ''}`}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <td className="p-4" onClick={(e) => toggleSelectCustomer(customer.id, e)}>
                        {selectedIds.has(customer.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{customer.username}</div>
                      </td>
                      <td className="p-4">{customer.full_name || 'N/A'}</td>
                      <td className="p-4">{customer.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {customer.connection_type === 'HOTSPOT' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <Cable className="w-3 h-3" />
                          )}
                          {customer.connection_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${customer.is_online
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                        >
                          {customer.is_online ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {getActivityStatus(customer)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${getAccountStatus(customer) === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : getAccountStatus(customer) === 'Expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {getAccountStatus(customer)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          {customer.plans?.name || 'No Plan'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(customer.valid_until)}
                        </div>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <CustomerActions
                            customerId={customer.id}
                            customerName={customer.username}
                            isActive={customer.is_active}
                            onStatusChange={loadCustomers}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/customers/${customer.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleting === customer.id}
                            onClick={async () => {
                              if (!confirm(`Delete ${customer.username}? This will also remove them from the MikroTik router.`)) return;
                              setDeleting(customer.id);
                              try {
                                // Delete from MikroTik first (mandatory)
                                const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
                                const mikrotikResponse = await fetch(`${mikrotikServiceUrl}/api/customers/${customer.id}/remove-from-mikrotik`, {
                                  method: 'DELETE'
                                });

                                if (!mikrotikResponse.ok) {
                                  const errorData = await mikrotikResponse.json();
                                  throw new Error(errorData.error || 'MikroTik service error');
                                }

                                const mikrotikResult = await mikrotikResponse.json();

                                // Allow deletion if no router assigned
                                if (!mikrotikResult.success && !mikrotikResult.message?.includes('No router assigned')) {
                                  throw new Error(mikrotikResult.error || 'Failed to remove from MikroTik');
                                }

                                // Delete from database (only after successful MikroTik deletion)
                                await supabase.from('customers').delete().eq('id', customer.id);
                                toast({ title: 'Deleted', description: `${customer.username} deleted from database and router` });
                                loadCustomers();
                              } catch (e: any) {
                                toast({ title: 'Error', description: e.message || 'Failed to delete. Ensure MikroTik service is running.', variant: 'destructive' });
                              } finally {
                                setDeleting(null);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

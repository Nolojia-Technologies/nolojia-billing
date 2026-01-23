"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  Wifi,
  WifiOff,
  Phone,
  Home,
  Download,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Play,
  Pause,
  UserX
} from "lucide-react";
import { useLandlordCustomers, useLandlordBuildings, useCustomerMutations } from "@/hooks/use-landlord";
import { TenantsSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay, EmptyState } from "@/components/landlord/error-display";
import { TenantDialog } from "@/components/landlord/tenant-dialog";
import { toast } from "@/components/ui/use-toast";
import { exportToCSV } from "@/services/landlord-export-service";

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filters = useMemo(() => ({
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    building_id: selectedBuilding !== "all" ? selectedBuilding : undefined,
    search: searchQuery || undefined
  }), [selectedStatus, selectedBuilding, searchQuery]);

  const {
    customers,
    loading: customersLoading,
    error: customersError,
    refresh: refreshCustomers
  } = useLandlordCustomers(filters);

  const {
    buildings,
    loading: buildingsLoading
  } = useLandlordBuildings();

  const { updateCustomerStatus, loading: mutationLoading } = useCustomerMutations();

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    if (status === "suspended") {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Suspended
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const isOverdue = (endDate: string | undefined) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const handleStatusChange = async (customerId: string, newStatus: 'active' | 'suspended') => {
    const result = await updateCustomerStatus(customerId, newStatus);
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Status Updated",
        description: `Customer has been ${newStatus === 'active' ? 'activated' : 'suspended'}.`
      });
      refreshCustomers();
    }
  };

  const handleExport = () => {
    const exportData = customers.map((t: any) => ({
      Name: t.name,
      Phone: t.phone || '-',
      Email: t.email || '-',
      Unit: t.unit?.unit_number || '-',
      Building: t.unit?.building?.name || '-',
      Package: t.subscription?.[0]?.package?.name || '-',
      Status: t.status,
      'Subscription End': t.subscription?.[0]?.end_date || '-'
    }));

    exportToCSV(exportData, 'tenants-export');
    toast({
      title: "Export Complete",
      description: "Tenant list has been downloaded."
    });
  };

  // Calculate stats
  const totalTenants = customers.length;
  const activeTenants = customers.filter((t: any) => t.status === 'active').length;
  const suspendedTenants = customers.filter((t: any) => t.status === 'suspended').length;

  if (customersLoading && customers.length === 0) {
    return <TenantsSkeleton />;
  }

  if (customersError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
          <p className="text-gray-500 dark:text-gray-400">View all tenants and their connection status</p>
        </div>
        <ErrorDisplay error={customersError} onRetry={refreshCustomers} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tenants
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View all tenants and their connection status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Tenants</p>
                <p className="text-3xl font-bold">{totalTenants}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Connections</p>
                <p className="text-3xl font-bold">{activeTenants}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Suspended</p>
                <p className="text-3xl font-bold">{suspendedTenants}</p>
              </div>
              <WifiOff className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={refreshCustomers} disabled={customersLoading}>
          <RefreshCw className={`h-4 w-4 ${customersLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tenants List */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12 text-gray-400" />}
          title="No tenants found"
          description={filters.status || filters.building_id || filters.search
            ? "Try adjusting your filters"
            : "Add your first tenant to get started"}
          action={!filters.status && !filters.building_id && !filters.search && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          )}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Tenant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Package
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Subscription
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {customers.map((tenant: any) => {
                    const subscription = tenant.subscription?.[0];
                    const endDate = subscription?.end_date;

                    return (
                      <tr
                        key={tenant.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {tenant.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {tenant.name}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {tenant.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {tenant.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{tenant.unit?.unit_number || '-'}</p>
                              <p className="text-xs text-gray-500">{tenant.unit?.building?.name || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">
                            {subscription?.package?.name || 'No package'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(tenant.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className={`text-sm ${isOverdue(endDate) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {endDate
                                ? `${isOverdue(endDate) ? 'Expired' : 'Expires'}: ${new Date(endDate).toLocaleDateString()}`
                                : 'No subscription'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={mutationLoading}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {tenant.status !== 'active' && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(tenant.id, 'active')}
                                  className="text-green-600"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {tenant.status === 'active' && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(tenant.id, 'suspended')}
                                  className="text-amber-600"
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-gray-600">
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Suspended tenants have limited or no internet access due to overdue payments.
          Connection status is automatically managed by Nolojia.
        </p>
      </div>

      {/* Add Tenant Dialog */}
      <TenantDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          setAddDialogOpen(false);
          refreshCustomers();
        }}
      />
    </div>
  );
}

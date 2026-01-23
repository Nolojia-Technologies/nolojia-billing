"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  CreditCard
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLandlordDashboard } from "@/hooks/use-landlord";
import { DashboardSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay } from "@/components/landlord/error-display";
import Link from "next/link";

export default function LandlordDashboard() {
  const {
    summary,
    buildings,
    recentPayments,
    paymentStatuses,
    loading,
    error,
    refresh
  } = useLandlordDashboard();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of your properties and revenue</p>
        </div>
        <ErrorDisplay error={error} onRetry={refresh} />
      </div>
    );
  }

  // Calculate collection rate from payment statuses
  const overdueCustomers = paymentStatuses.filter(c => c.is_overdue);
  const collectionRate = summary?.total_customers
    ? Math.round(((summary.total_customers - overdueCustomers.length) / summary.total_customers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overview of your properties and revenue
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue This Month */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Your Earnings (This Month)
                </p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(summary?.earnings_this_month || 0)}
                </p>
                <p className="text-green-100 text-xs mt-2">
                  Total collected: {formatCurrency(summary?.revenue_this_month || 0)}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Tenants */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Active Tenants
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {summary?.active_customers || 0}
                  <span className="text-lg text-gray-400 font-normal">
                    /{summary?.total_customers || 0}
                  </span>
                </p>
                <div className="flex items-center mt-2">
                  <Wifi className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">
                    {summary?.active_customers || 0} online
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buildings */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Properties
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {summary?.total_buildings || 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {summary?.total_units || 0} total units
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Collection Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {collectionRate}%
                </p>
                <div className="flex items-center mt-2">
                  {collectionRate >= 80 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">Good</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-amber-500 mr-1" />
                      <span className="text-xs text-amber-600">Needs attention</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Building Occupancy */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Building Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {buildings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No buildings found</p>
            ) : (
              buildings.map((building) => (
                <div key={building.building_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{building.building_name}</span>
                    <span className="text-sm text-gray-500">
                      {building.occupied_units}/{building.total_units} occupied
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${building.total_units > 0
                          ? (building.occupied_units / building.total_units) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3 text-green-500" />
                      {building.active_connections} active
                    </span>
                    <span className="flex items-center gap-1">
                      <WifiOff className="h-3 w-3 text-red-500" />
                      {building.occupied_units - building.active_connections} suspended
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Recent Payments
              </CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </div>
            <Link href="/landlord/payments">
              <Button variant="ghost" size="sm" className="text-blue-600">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent payments</p>
              ) : (
                recentPayments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {(payment.customer as any)?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.paid_at
                          ? formatDistanceToNow(new Date(payment.paid_at), { addSuffix: true })
                          : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Tenants Alert */}
      {overdueCustomers.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Clock className="h-5 w-5" />
              Overdue Payments
              <Badge variant="secondary" className="ml-2 bg-amber-200 text-amber-800">
                {overdueCustomers.length} tenants
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              These tenants have overdue payments and may have limited access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overdueCustomers.slice(0, 6).map((tenant) => (
                <div
                  key={tenant.customer_id}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{tenant.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {tenant.unit_number} • {tenant.building_name}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Amount due:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(tenant.amount_due)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {overdueCustomers.length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/landlord/tenants?status=suspended">
                  <Button variant="outline" size="sm">
                    View All {overdueCustomers.length} Overdue
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>
          Internet services managed by{" "}
          <span className="font-semibold text-blue-600">Nolojia</span>
        </p>
        <p className="text-xs mt-1">
          For technical support, contact support@nolojia.com
        </p>
      </div>
    </div>
  );
}

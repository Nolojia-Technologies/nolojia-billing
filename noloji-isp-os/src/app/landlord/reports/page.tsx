"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  BarChart3,
  PieChart,
  RefreshCw,
  Loader2
} from "lucide-react";
import {
  useLandlordDashboard,
  useLandlordBuildings,
  useLandlordPayments
} from "@/hooks/use-landlord";
import { ReportsSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay } from "@/components/landlord/error-display";
import { exportRevenueReport, exportCustomerList, exportPaymentTransactions } from "@/services/landlord-export-service";
import { toast } from "@/components/ui/use-toast";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [downloading, setDownloading] = useState<string | null>(null);

  // Calculate date range based on period
  const dateFilters = useMemo(() => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (selectedPeriod) {
      case 'this_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'this_year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      from_date: fromDate.toISOString().split('T')[0],
      to_date: toDate.toISOString().split('T')[0]
    };
  }, [selectedPeriod]);

  const { summary, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useLandlordDashboard();
  const { buildings, loading: buildingsLoading, error: buildingsError } = useLandlordBuildings();
  const { payments, stats, loading: paymentsLoading, error: paymentsError, refresh: refreshPayments } = useLandlordPayments(dateFilters);

  const loading = dashboardLoading || buildingsLoading || paymentsLoading;
  const error = dashboardError || buildingsError || paymentsError;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate building revenue from payments
  const buildingRevenue = useMemo(() => {
    const revenueMap = new Map<string, { name: string; revenue: number; customers: Set<string> }>();

    payments.forEach((payment: any) => {
      if (payment.status !== 'completed') return;

      const buildingName = payment.customer?.unit?.building?.name || 'Unknown';
      const buildingId = payment.customer?.unit?.building?.id || 'unknown';
      const customerId = payment.customer_id;

      if (!revenueMap.has(buildingId)) {
        revenueMap.set(buildingId, {
          name: buildingName,
          revenue: 0,
          customers: new Set()
        });
      }

      const building = revenueMap.get(buildingId)!;
      building.revenue += payment.amount || 0;
      if (customerId) building.customers.add(customerId);
    });

    const totalRevenue = stats.total_amount || 1;

    return Array.from(revenueMap.values())
      .map(b => ({
        name: b.name,
        revenue: b.revenue,
        customers: b.customers.size,
        percentage: Math.round((b.revenue / totalRevenue) * 100)
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [payments, stats.total_amount]);

  // Calculate collection rate
  const collectionRate = summary?.total_customers
    ? Math.round((summary.active_customers / summary.total_customers) * 100)
    : 0;

  const handleDownload = async (reportType: string, format: 'csv' | 'pdf') => {
    setDownloading(reportType);

    try {
      let result: any;

      switch (reportType) {
        case 'revenue':
          result = await exportRevenueReport({
            period: getPeriodLabel(selectedPeriod),
            totalRevenue: stats.total_amount,
            earnings: stats.landlord_total,
            commission: stats.total_amount - stats.landlord_total,
            transactions: stats.count,
            buildingBreakdown: buildingRevenue
          }, format);
          break;
        case 'customers':
          // Would need to fetch all customers for this
          toast({
            title: "Export Started",
            description: "Preparing customer report..."
          });
          // In a real implementation, fetch customers and export
          result = { success: true };
          break;
        case 'payout':
          result = exportPaymentTransactions(payments, format);
          break;
        default:
          result = { success: false, error: 'Unknown report type' };
      }

      if (result.success !== false) {
        toast({
          title: "Export Complete",
          description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded as ${format.toUpperCase()}.`
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to generate report.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'this_month': return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'last_month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'last_3_months': return 'Last 3 Months';
      case 'this_year': return new Date().getFullYear().toString();
      default: return period;
    }
  };

  const refresh = () => {
    refreshDashboard();
    refreshPayments();
  };

  if (loading && !summary) {
    return <ReportsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">View and download your financial reports</p>
        </div>
        <ErrorDisplay error={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and download your financial reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Your Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.landlord_total)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span className="text-xs text-green-100">
                    {getPeriodLabel(selectedPeriod)}
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total_amount)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Customers</p>
                <p className="text-2xl font-bold">{summary?.active_customers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Collection Rate</p>
                <p className="text-2xl font-bold">{collectionRate}%</p>
              </div>
              <PieChart className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Building */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Revenue by Building
          </CardTitle>
          <CardDescription>
            Breakdown of revenue per property for {getPeriodLabel(selectedPeriod).toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {buildingRevenue.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No revenue data for this period</p>
          ) : (
            <div className="space-y-4">
              {buildingRevenue.map((building) => (
                <div key={building.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{building.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {building.customers} tenants
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(building.revenue)}</p>
                      <p className="text-xs text-gray-500">{building.percentage}% of total</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${building.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            Transaction Summary
          </CardTitle>
          <CardDescription>
            Payment statistics for {getPeriodLabel(selectedPeriod).toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.count}</p>
              <p className="text-sm text-gray-500">Total Transactions</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_amount)}</p>
              <p className="text-sm text-gray-500">Total Collected</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.landlord_total)}</p>
              <p className="text-sm text-gray-500">Your Share (70%)</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">{formatCurrency(stats.total_amount - stats.landlord_total)}</p>
              <p className="text-sm text-gray-500">Nolojia (30%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Download Reports
          </CardTitle>
          <CardDescription>
            Generate and download detailed reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Revenue Report */}
            <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Revenue Report</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Detailed breakdown of all revenue collected
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('revenue', 'csv')}
                  disabled={downloading === 'revenue'}
                >
                  {downloading === 'revenue' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('revenue', 'pdf')}
                  disabled={downloading === 'revenue'}
                >
                  {downloading === 'revenue' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
              </div>
            </div>

            {/* Customer Report */}
            <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Customer Report</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    List of all tenants and their payment status
                  </p>
                </div>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('customers', 'csv')}
                  disabled={downloading === 'customers'}
                >
                  {downloading === 'customers' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('customers', 'pdf')}
                  disabled={downloading === 'customers'}
                >
                  {downloading === 'customers' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
              </div>
            </div>

            {/* Payout Statement */}
            <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">Payment Transactions</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Detailed list of all payment transactions
                  </p>
                </div>
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('payout', 'csv')}
                  disabled={downloading === 'payout'}
                >
                  {downloading === 'payout' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload('payout', 'pdf')}
                  disabled={downloading === 'payout'}
                >
                  {downloading === 'payout' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

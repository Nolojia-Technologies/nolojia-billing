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
  CreditCard,
  Search,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { useLandlordPayments } from "@/hooks/use-landlord";
import { PaymentsSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay, EmptyState } from "@/components/landlord/error-display";
import { exportPaymentTransactions } from "@/services/landlord-export-service";
import { toast } from "@/components/ui/use-toast";

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Calculate date filters based on selected month
  const dateFilters = useMemo(() => {
    if (selectedMonth === "all") return {};

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    if (selectedMonth === "last_month") {
      month = month - 1;
      if (month < 0) {
        month = 11;
        year = year - 1;
      }
    } else if (selectedMonth === "last_3_months") {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return {
        from_date: threeMonthsAgo.toISOString().split('T')[0]
      };
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return {
      from_date: startDate.toISOString().split('T')[0],
      to_date: endDate.toISOString().split('T')[0]
    };
  }, [selectedMonth]);

  const filters = useMemo(() => ({
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    ...dateFilters,
    search: searchQuery || undefined
  }), [selectedStatus, dateFilters, searchQuery]);

  const {
    payments,
    stats,
    loading,
    error,
    refresh
  } = useLandlordPayments(filters);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    const result = exportPaymentTransactions(payments, format);
    if (format === 'csv' || (result as any).success) {
      toast({
        title: "Export Complete",
        description: `Payment report has been downloaded as ${format.toUpperCase()}.`
      });
    } else {
      toast({
        title: "Export Failed",
        description: (result as any).error || "Failed to generate export.",
        variant: "destructive"
      });
    }
  };

  // Calculate commission
  const nolojiaCommission = stats.total_amount - stats.landlord_total;

  if (loading && payments.length === 0) {
    return <PaymentsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400">Track all payment transactions from your tenants</p>
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
            Payments
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track all payment transactions from your tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Your Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.landlord_total)}</p>
                <p className="text-xs text-green-200 mt-1">After 30% commission</p>
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
                <p className="text-xs text-gray-400 mt-1">
                  {selectedMonth === 'all' ? 'All time' : 'Selected period'}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Transactions</p>
                <p className="text-2xl font-bold">{stats.count}</p>
                <p className="text-xs text-gray-400 mt-1">Successful payments</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Nolojia Commission</p>
                <p className="text-2xl font-bold">{formatCurrency(nolojiaCommission)}</p>
                <p className="text-xs text-gray-400 mt-1">30% of collections</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12 text-gray-400" />}
          title="No payments found"
          description={filters.status || filters.from_date || filters.search
            ? "Try adjusting your filters"
            : "Payments will appear here when tenants make payments"}
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
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Your Share
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payments.map((payment: any) => {
                    const { date, time } = formatDateTime(payment.created_at || payment.paid_at || new Date().toISOString());
                    const customer = payment.customer;

                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {customer?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {customer?.unit?.unit_number || '-'} • {customer?.unit?.building?.name || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(payment.amount || 0)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-semibold ${payment.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                            {payment.status === 'completed' ? formatCurrency(payment.landlord_share || 0) : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {payment.payment_method === "mpesa" ? (
                              <Smartphone className="h-4 w-4 text-green-600" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                              <p className="text-sm capitalize">{payment.payment_method || '-'}</p>
                              <p className="text-xs text-gray-400">
                                {payment.transaction_ref || payment.mpesa_receipt || '-'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(payment.status || 'pending')}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm">{date}</p>
                            <p className="text-xs text-gray-400">{time}</p>
                          </div>
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

      {/* Commission Note */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                About Your Earnings
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Nolojia retains a 30% commission on all payments for providing internet infrastructure,
                billing systems, and technical support. Your earnings (70%) are automatically calculated
                and paid out monthly to your configured payout method.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

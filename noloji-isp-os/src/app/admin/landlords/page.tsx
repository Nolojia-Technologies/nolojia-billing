"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  DollarSign,
  Router,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Plus
} from "lucide-react";

// Mock data
const mockStats = {
  total_landlords: 12,
  active_landlords: 10,
  total_buildings: 45,
  total_units: 680,
  total_customers: 520,
  active_customers: 485,
  suspended_customers: 35,
  total_revenue_month: 1560000,
  pending_payouts: 890000,
  routers_online: 38,
  routers_offline: 2,
  enforcement_queue: 15
};

const mockRecentLandlords = [
  { id: 1, name: "Sunrise Properties", buildings: 5, customers: 85, revenue: 170000, status: "active" },
  { id: 2, name: "Green Valley Ltd", buildings: 3, customers: 45, revenue: 90000, status: "active" },
  { id: 3, name: "City Heights", buildings: 4, customers: 62, revenue: 124000, status: "active" },
  { id: 4, name: "Metro Living", buildings: 2, customers: 30, revenue: 60000, status: "pending" },
];

const mockAlerts = [
  { id: 1, type: "error", message: "Router 'Building-C-Router' offline for 2 hours", time: "10 minutes ago" },
  { id: 2, type: "warning", message: "15 customers pending enforcement", time: "1 hour ago" },
  { id: 3, type: "info", message: "New landlord 'Metro Living' awaiting verification", time: "2 hours ago" },
  { id: 4, type: "success", message: "Monthly payouts processed successfully", time: "1 day ago" },
];

export default function AdminLandlordsDashboard() {
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error": return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Landlord Management Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overview of all landlord operations and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/landlords/manage/new">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Landlord
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Landlords */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Total Landlords
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {mockStats.total_landlords}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {mockStats.active_landlords} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buildings & Units */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Buildings / Units
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {mockStats.total_buildings}
                  <span className="text-lg text-gray-400 font-normal">
                    /{mockStats.total_units}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Across all landlords
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Total Customers
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {mockStats.total_customers}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center text-xs text-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    {mockStats.active_customers}
                  </span>
                  <span className="flex items-center text-xs text-red-600">
                    <WifiOff className="h-3 w-3 mr-1" />
                    {mockStats.suspended_customers}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Revenue (This Month)
                </p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(mockStats.total_revenue_month)}
                </p>
                <p className="text-xs text-orange-100 mt-1">
                  Pending payouts: {formatCurrency(mockStats.pending_payouts)}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Router Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Router className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Routers Online</p>
                  <p className="text-2xl font-bold text-green-600">
                    {mockStats.routers_online}
                    <span className="text-sm text-gray-400 font-normal">
                      /{mockStats.routers_online + mockStats.routers_offline}
                    </span>
                  </p>
                </div>
              </div>
              {mockStats.routers_offline > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {mockStats.routers_offline} offline
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enforcement Queue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Enforcement Queue</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {mockStats.enforcement_queue}
                  </p>
                </div>
              </div>
              <Link href="/admin/landlords/enforcement">
                <Button variant="outline" size="sm">
                  Process
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Pending Payouts</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(mockStats.pending_payouts)}
                  </p>
                </div>
              </div>
              <Link href="/admin/landlords/billing">
                <Button variant="outline" size="sm">
                  Process
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Landlords */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Landlords Overview</CardTitle>
              <CardDescription>Recent landlord performance</CardDescription>
            </div>
            <Link href="/admin/landlords/manage">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Landlord</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Buildings</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Customers</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Revenue</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mockRecentLandlords.map((landlord) => (
                    <tr key={landlord.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-orange-600">
                              {landlord.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium">{landlord.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{landlord.buildings}</td>
                      <td className="px-4 py-3 text-center">{landlord.customers}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(landlord.revenue)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={landlord.status === 'active' ? 'default' : 'secondary'}
                          className={landlord.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                        >
                          {landlord.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

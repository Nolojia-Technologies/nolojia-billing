"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/charts/kpi-card";
import { useDashboardKPIs, useRecentAlerts } from "@/hooks/use-dashboard";

// Dynamically import heavy chart components - reduces initial bundle size
const BandwidthChart = dynamic(
  () => import("@/components/charts/bandwidth-chart").then((mod) => mod.BandwidthChart),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

const NetworkMiniMap = dynamic(
  () => import("@/components/charts/network-mini-map").then((mod) => mod.NetworkMiniMap),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);
import { formatCurrency, dateUtils, getStatusColor } from "@/lib/utils";
import {
  Users,
  Router,
  DollarSign,
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  Globe,
  ArrowUpRight
} from "lucide-react";

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: alertsResponse, isLoading: alertsLoading } = useRecentAlerts();

  const recentAlerts = alertsResponse?.data || [];

  return (
    <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Noloji ISP OS. Here&apos;s an overview of your network operations.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Customers"
            value={kpis?.totalCustomers.toLocaleString() || '0'}
            change="+12.5%"
            changeType="positive"
            description="from last month"
            icon={Users}
            loading={kpisLoading}
          />

          <KPICard
            title="Active Sessions"
            value={kpis?.activeSessions.toLocaleString() || '0'}
            change="+8.2%"
            changeType="positive"
            description="from yesterday"
            icon={Activity}
            loading={kpisLoading}
          />

          <KPICard
            title="Monthly Revenue"
            value={kpis ? formatCurrency(kpis.revenue30d) : formatCurrency(0)}
            change={kpis?.revenueChange || '+0%'}
            changeType="positive"
            description="from last month"
            icon={DollarSign}
            loading={kpisLoading}
          />

          <KPICard
            title="Network Uptime"
            value={kpis ? `${kpis.networkUptime}%` : '0%'}
            change="+0.2%"
            changeType="positive"
            description="this month"
            icon={Zap}
            loading={kpisLoading}
          />
        </div>

        {/* Secondary Stats and Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Router className="h-5 w-5" />
                <span>Network Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpisLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Online Devices</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{kpis?.onlineDevices || 0}</span>
                      <Badge variant="success" className="text-xs">
                        {kpis && kpis.totalDevices > 0
                          ? `${Math.round((kpis.onlineDevices / kpis.totalDevices) * 100)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offline Devices</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {kpis ? kpis.totalDevices - kpis.onlineDevices : 0}
                      </span>
                      <Badge variant="warning" className="text-xs">
                        {kpis && kpis.totalDevices > 0
                          ? `${Math.round(((kpis.totalDevices - kpis.onlineDevices) / kpis.totalDevices) * 100)}%`
                          : '0%'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Alerts</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{kpis?.activeAlerts || 0}</span>
                      <Badge
                        variant={kpis && kpis.activeAlerts > 5 ? "destructive" : kpis && kpis.activeAlerts > 0 ? "warning" : "success"}
                        className="text-xs"
                      >
                        {kpis && kpis.activeAlerts > 5 ? "High" : kpis && kpis.activeAlerts > 0 ? "Normal" : "Good"}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Bandwidth Usage</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpisLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Usage</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{kpis?.bandwidthUsage || 0}%</span>
                      <Badge
                        variant={kpis && kpis.bandwidthUsage > 80 ? "destructive" : kpis && kpis.bandwidthUsage > 60 ? "warning" : "success"}
                        className="text-xs"
                      >
                        {kpis && kpis.bandwidthUsage > 80 ? "High" : kpis && kpis.bandwidthUsage > 60 ? "Medium" : "Normal"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Peak Today</span>
                    <span className="text-sm font-medium">{kpis ? Math.round(kpis.bandwidthUsage * 1.1) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Available</span>
                    <span className="text-sm font-medium text-success">
                      {kpis ? Math.round(100 - kpis.bandwidthUsage) : 100}%
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <NetworkMiniMap loading={kpisLoading} />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BandwidthChart loading={kpisLoading} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Recent Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentAlerts.length > 0 ? (
                <div className="space-y-4">
                  {recentAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center space-x-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          alert.severity === 'critical' ? 'bg-danger' :
                          alert.severity === 'high' ? 'bg-danger' :
                          alert.severity === 'medium' ? 'bg-warning' :
                          'bg-info'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.affectedEntity.name} - {dateUtils.fromNow(alert.createdAt)}
                        </p>
                      </div>
                      <Badge variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Add Customer</span>
                <span className="text-xs text-muted-foreground">Register new customer</span>
              </div>

              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Router className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Adopt Device</span>
                <span className="text-xs text-muted-foreground">Provision new hardware</span>
              </div>

              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <DollarSign className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Generate Invoice</span>
                <span className="text-xs text-muted-foreground">Create billing invoice</span>
              </div>

              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <AlertTriangle className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">View Alerts</span>
                <span className="text-xs text-muted-foreground">Manage system alerts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
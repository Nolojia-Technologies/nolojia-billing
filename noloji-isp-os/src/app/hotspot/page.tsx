"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  Wifi,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Signal,
  Users,
  Shield,
  MapPin,
  Activity,
  Clock,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react";

// Mock data for hotspots
const mockHotspots = [
  {
    id: "HS-001",
    name: "Downtown Coffee Shop",
    location: "123 Main St, Springfield",
    ssid: "NolojiFree-Downtown",
    status: "active",
    connectedUsers: 24,
    maxUsers: 50,
    bandwidth: "100 Mbps",
    uptime: "99.8%",
    dataUsage: "2.4 GB",
    security: "WPA3",
    lastActivity: "2 minutes ago",
    signalStrength: 95
  },
  {
    id: "HS-002",
    name: "City Library",
    location: "456 Oak Ave, Springfield",
    ssid: "NolojiFree-Library",
    status: "active",
    connectedUsers: 18,
    maxUsers: 30,
    bandwidth: "50 Mbps",
    uptime: "99.5%",
    dataUsage: "1.8 GB",
    security: "WPA3",
    lastActivity: "5 minutes ago",
    signalStrength: 88
  },
  {
    id: "HS-003",
    name: "Springfield Mall",
    location: "789 Pine St, Springfield",
    ssid: "NolojiFree-Mall",
    status: "warning",
    connectedUsers: 45,
    maxUsers: 100,
    bandwidth: "200 Mbps",
    uptime: "97.2%",
    dataUsage: "8.2 GB",
    security: "WPA3",
    lastActivity: "1 minute ago",
    signalStrength: 72,
    issue: "High utilization"
  },
  {
    id: "HS-004",
    name: "Community Center",
    location: "321 Elm Rd, Springfield",
    ssid: "NolojiFree-Community",
    status: "offline",
    connectedUsers: 0,
    maxUsers: 40,
    bandwidth: "75 Mbps",
    uptime: "0%",
    dataUsage: "0 GB",
    security: "WPA3",
    lastActivity: "2 hours ago",
    signalStrength: 0,
    issue: "Device offline"
  }
];

const statusConfig = {
  active: { color: "success", icon: CheckCircle, label: "Active" },
  warning: { color: "warning", icon: AlertTriangle, label: "Warning" },
  offline: { color: "destructive", icon: AlertTriangle, label: "Offline" }
} as const;

export default function HotspotPage() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ssid: '',
    bandwidth: '100',
    maxUsers: '50',
    security: 'WPA3'
  });

  const totalUsers = mockHotspots.reduce((sum, hs) => sum + hs.connectedUsers, 0);
  const totalCapacity = mockHotspots.reduce((sum, hs) => sum + hs.maxUsers, 0);
  const activeHotspots = mockHotspots.filter(hs => hs.status === 'active').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      // TODO: Integrate with backend API to save hotspot
      // For now, just show a success toast
      toast({
        title: 'Success',
        description: 'Hotspot created successfully'
      });
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create hotspot',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      ssid: '',
      bandwidth: '100',
      maxUsers: '50',
      security: 'WPA3'
    });
    setShowForm(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hotspot</h1>
          <p className="text-muted-foreground">
            WiFi hotspot management and public internet access
          </p>
        </div>
        <Button
          className="flex items-center space-x-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Add Hotspot</span>
        </Button>
      </div>

      {/* Add Hotspot Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add New Hotspot</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hotspot Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Downtown Coffee Shop"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="123 Main St, Springfield"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssid">SSID *</Label>
                  <Input
                    id="ssid"
                    value={formData.ssid}
                    onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                    placeholder="NolojiFree-Downtown"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bandwidth">Bandwidth (Mbps)</Label>
                  <Input
                    id="bandwidth"
                    type="number"
                    value={formData.bandwidth}
                    onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security">Security</Label>
                  <select
                    id="security"
                    value={formData.security}
                    onChange={(e) => setFormData({ ...formData, security: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="WPA3">WPA3</option>
                    <option value="WPA2">WPA2</option>
                    <option value="Open">Open (No Password)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Hotspot'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hotspots</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockHotspots.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeHotspots} active locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((totalUsers / totalCapacity) * 100)}% capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Signal</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(mockHotspots.reduce((sum, hs) => sum + hs.signalStrength, 0) / mockHotspots.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Signal strength
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.4 GB</div>
            <p className="text-xs text-muted-foreground">
              Today's total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hotspot Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>WiFi Hotspot Network</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  placeholder="Search hotspots..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHotspots.map((hotspot) => {
              const StatusIcon = statusConfig[hotspot.status as keyof typeof statusConfig].icon;
              const utilizationPercent = Math.round((hotspot.connectedUsers / hotspot.maxUsers) * 100);

              return (
                <div
                  key={hotspot.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wifi className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{hotspot.name}</h3>
                        <Badge variant={statusConfig[hotspot.status as keyof typeof statusConfig].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[hotspot.status as keyof typeof statusConfig].label}
                        </Badge>
                        {hotspot.issue && (
                          <Badge variant="outline">
                            {hotspot.issue}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>SSID: {hotspot.ssid}</span>
                        <span>•</span>
                        <span>{hotspot.bandwidth}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3" />
                          <span>{hotspot.security}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{hotspot.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {hotspot.connectedUsers}/{hotspot.maxUsers}
                      </p>
                      <p className="text-xs text-muted-foreground">Users</p>
                      <div className="w-16 bg-muted rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${utilizationPercent > 80 ? 'bg-destructive' :
                            utilizationPercent > 60 ? 'bg-warning' : 'bg-success'
                            }`}
                          style={{ width: `${utilizationPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium">{hotspot.signalStrength}%</p>
                      <p className="text-xs text-muted-foreground">Signal</p>
                      <div className="flex items-center justify-center mt-1">
                        <Signal className={`h-4 w-4 ${hotspot.signalStrength > 80 ? 'text-success' :
                          hotspot.signalStrength > 60 ? 'text-warning' : 'text-destructive'
                          }`} />
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">{hotspot.uptime}</p>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="text-xs text-muted-foreground">{hotspot.dataUsage} today</p>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{hotspot.lastActivity}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Plus className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Deploy Hotspot</h3>
            <p className="text-sm text-muted-foreground text-center">
              Install new WiFi access point
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Settings className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Configure Network</h3>
            <p className="text-sm text-muted-foreground text-center">
              Manage SSID and security
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Eye className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Monitor Usage</h3>
            <p className="text-sm text-muted-foreground text-center">
              View real-time analytics
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Shield className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Security Settings</h3>
            <p className="text-sm text-muted-foreground text-center">
              Configure access control
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
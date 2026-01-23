'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { supabasePlanApi } from '@/lib/supabase-api';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Edit, Save, X, User, Phone, Mail,
  MapPin, Calendar, Package, Activity, Wifi, Cable, Trash2, Signal, Router
} from 'lucide-react';
import { DateTimePicker } from '@/components/ui/datetime-picker';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);

  // Quick expiry edit state
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [quickExpiryDate, setQuickExpiryDate] = useState<Date | undefined>(undefined);

  // CPE State
  const [cpe, setCpe] = useState<any>(null);
  const [cpeLoading, setCpeLoading] = useState(false);
  const [cpeForm, setCpeForm] = useState({
    cpe_ip: '',
    cpe_port: '23',
    cpe_username: 'admin',
    cpe_password: '',
    cpe_type: 'gpon'
  });

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
    connection_type: 'HOTSPOT',
    plan_id: '',
    router_id: '',
    mac_address: '',
    valid_until: '',
    is_active: true,
    notes: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    loadCustomer();
    loadPackages();
    loadRouters();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*, plans:plan_id(name, price, currency), routers:router_id(name)')
        .eq('id', parseInt(customerId))
        .single();

      if (error) throw error;
      if (!data) throw new Error('Customer not found');

      const customerData = {
        ...data,
        plan_name: data.plans?.name,
        router_name: data.routers?.name
      };

      setCustomer(customerData);
      setFormData({
        username: data.username || '',
        password: '', // Empty - user can optionally set new password
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        id_number: data.id_number || '',
        connection_type: data.connection_type || 'HOTSPOT',
        plan_id: data.plan_id?.toString() || '',
        router_id: data.router_id?.toString() || '',
        mac_address: data.mac_address || '',
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString().split('T')[0] : '',
        is_active: data.is_active !== false,
        notes: data.notes || '',
        latitude: data.latitude?.toString() || '',
        longitude: data.longitude?.toString() || ''
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load customer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const data = await supabasePlanApi.getAll();
      setPackages(data || []);
    } catch (error) {
      console.error('Failed to load packages');
      setPackages([]);
    }
  };

  const loadRouters = async () => {
    try {
      const { data } = await supabase
        .from('routers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setRouters(data || []);
    } catch (error) {
      console.error('Failed to load routers');
      setRouters([]);
    }
  };

  // CPE Functions
  const loadCpe = async () => {
    try {
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/cpe`);
      const result = await response.json();
      if (result.success && result.data) {
        setCpe(result.data);
        setCpeForm({
          cpe_ip: result.data.cpe_ip || '',
          cpe_port: result.data.cpe_port?.toString() || '23',
          cpe_username: result.data.cpe_username || 'admin',
          cpe_password: result.data.cpe_password || '',
          cpe_type: result.data.cpe_type || 'gpon'
        });
      }
    } catch (error) {
      console.error('Failed to load CPE');
    }
  };

  const saveCpe = async () => {
    try {
      setCpeLoading(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/cpe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpe_ip: cpeForm.cpe_ip,
          cpe_port: parseInt(cpeForm.cpe_port),
          cpe_username: cpeForm.cpe_username,
          cpe_password: cpeForm.cpe_password,
          cpe_type: cpeForm.cpe_type
        })
      });
      const result = await response.json();
      if (result.success) {
        setCpe(result.data);
        toast({ title: 'Saved', description: 'CPE credentials saved' });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCpeLoading(false);
    }
  };

  const testCpe = async () => {
    try {
      setCpeLoading(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/cpe/test`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Connection successful!' });
      } else {
        toast({ title: 'Failed', description: result.error || 'Connection failed', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCpeLoading(false);
    }
  };

  const refreshOptical = async () => {
    try {
      setCpeLoading(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/cpe/optical`);
      const result = await response.json();
      if (result.success) {
        setCpe((prev: any) => ({ ...prev, last_optical_rx: result.data.rxPower, last_optical_tx: result.data.txPower }));
        toast({ title: 'Updated', description: 'Optical power refreshed' });
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCpeLoading(false);
    }
  };

  useEffect(() => {
    loadCpe();
  }, [customerId]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const payload: any = {
        username: formData.username,
        full_name: formData.full_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        id_number: formData.id_number || null,
        connection_type: formData.connection_type,
        plan_id: formData.plan_id ? parseInt(formData.plan_id) : null,
        router_id: formData.router_id ? parseInt(formData.router_id) : null,
        mac_address: formData.mac_address || null,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
        notes: formData.notes || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      // Only update password if a new one is provided
      if (formData.password) {
        payload.password = formData.password;
      }

      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', parseInt(customerId));

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customer updated successfully'
      });

      // Try to sync update to MikroTik (optional if customer has router)
      if (customer.router_id && (formData.username !== customer.username || formData.password)) {
        try {
          const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
          await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/provision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (syncError) {
          console.log('MikroTik sync skipped');
        }
      }

      setEditing(false);
      loadCustomer();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update customer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete customer "${customer.username}"? This will also remove them from the MikroTik router. This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      // Delete from MikroTik first (mandatory - blocks database deletion if this fails)
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';

      try {
        const mikrotikResponse = await fetch(`${mikrotikServiceUrl}/api/customers/${customerId}/remove-from-mikrotik`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!mikrotikResponse.ok) {
          const errorData = await mikrotikResponse.json();
          throw new Error(errorData.error || 'MikroTik service returned an error');
        }

        const mikrotikResult = await mikrotikResponse.json();

        if (!mikrotikResult.success) {
          throw new Error(mikrotikResult.error || 'Failed to remove from MikroTik');
        }

        console.log('MikroTik delete result:', mikrotikResult);
      } catch (mikrotikError: any) {
        // If no router assigned, we can proceed with deletion
        if (mikrotikError.message?.includes('No router assigned')) {
          console.log('No router assigned, proceeding with database deletion');
        } else {
          throw new Error(`Cannot delete: ${mikrotikError.message || 'Failed to remove customer from MikroTik router. Please ensure the MikroTik service is running.'}`);
        }
      }

      // Delete from database (only after successful MikroTik deletion)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', parseInt(customerId));

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customer deleted from both database and MikroTik router'
      });

      router.push('/customers');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete customer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickExpiryUpdate = async () => {
    if (!quickExpiryDate) return;

    try {
      setLoading(true);

      // Convert Date to ISO string for database storage
      const expiryDateString = quickExpiryDate.toISOString();

      const { error } = await supabase
        .from('customers')
        .update({ valid_until: expiryDateString })
        .eq('id', parseInt(customerId));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Subscription expiry updated to ${quickExpiryDate.toLocaleString()}`
      });

      setShowExpiryDialog(false);
      setQuickExpiryDate(undefined);
      loadCustomer(); // Refresh customer data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expiry date',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading && !customer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading customer details...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.username}</h1>
            <p className="text-muted-foreground">{customer.full_name || 'No name provided'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  loadCustomer();
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="router">Router</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Username:</span>
                  <span>{customer.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span>{customer.full_name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{customer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{customer.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Address:</span>
                  <span>{customer.address || 'N/A'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {customer.connection_type === 'HOTSPOT' ? (
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Cable className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">Connection Type:</span>
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                    {customer.connection_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Activity:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${customer.is_online
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {customer.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${customer.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Package:</span>
                  <span>{customer.plan_name || 'No Package'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Expiry:</span>
                  <span className={customer.valid_until && new Date(customer.valid_until) < new Date() ? 'text-red-600' : ''}>
                    {formatDate(customer.valid_until)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowExpiryDialog(true)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Expiry Date Edit Dialog */}
          {showExpiryDialog && (
            <Card className="p-4 mt-4 border-2 border-primary">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Change Subscription Expiry Date
              </h4>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[240px]">
                  <Label>New Expiry Date & Time</Label>
                  <DateTimePicker
                    date={quickExpiryDate}
                    setDate={setQuickExpiryDate}
                    placeholder="Select expiry date & time"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 7);
                      newDate.setHours(23, 59, 0, 0);
                      setQuickExpiryDate(newDate);
                    }}
                  >
                    +7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 30);
                      newDate.setHours(23, 59, 0, 0);
                      setQuickExpiryDate(newDate);
                    }}
                  >
                    +30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 365);
                      newDate.setHours(23, 59, 0, 0);
                      setQuickExpiryDate(newDate);
                    }}
                  >
                    +1 Year
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleQuickExpiryUpdate} disabled={loading || !quickExpiryDate}>
                  <Save className="w-4 h-4 mr-2" />
                  Update Expiry
                </Button>
                <Button variant="outline" onClick={() => setShowExpiryDialog(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? 'Edit Customer Details' : 'Customer Details'}
            </h3>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password (leave empty to keep current)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="id_number">ID Number</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="connection_type">Connection Type</Label>
                    <select
                      id="connection_type"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                      value={formData.connection_type}
                      onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}
                    >
                      <option value="HOTSPOT">Hotspot</option>
                      <option value="PPPOE">PPPOE</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="plan_id">Package</Label>
                    <select
                      id="plan_id"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                      value={formData.plan_id}
                      onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    >
                      <option value="">No Package</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.currency} {pkg.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="router_id">Router</Label>
                    <select
                      id="router_id"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                      value={formData.router_id}
                      onChange={(e) => setFormData({ ...formData, router_id: e.target.value })}
                    >
                      <option value="">No Router</option>
                      {routers.map((router) => (
                        <option key={router.id} value={router.id}>
                          {router.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="mac_address">MAC Address</Label>
                    <Input
                      id="mac_address"
                      value={formData.mac_address}
                      onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                      placeholder="00:11:22:33:44:55"
                    />
                  </div>

                  <div>
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="latitude">Latitude (for GIS Map)</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="e.g., -1.2921"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="longitude">Longitude (for GIS Map)</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="e.g., 36.8219"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground min-h-[80px] resize-none"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <Label htmlFor="is_active">Account Active</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p><strong>ID Number:</strong> {customer.id_number || 'N/A'}</p>
                <p><strong>MAC Address:</strong> {customer.mac_address || 'N/A'}</p>
                <p><strong>Router:</strong> {customer.router_name || 'N/A'}</p>
                <p><strong>Created:</strong> {formatDate(customer.created_at)}</p>
                <p><strong>Last Login:</strong> {formatDate(customer.last_login)}</p>
                <p><strong>Notes:</strong> {customer.notes || 'No notes'}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Session History</h3>
            <p className="text-muted-foreground">Session history will be displayed here</p>
          </Card>
        </TabsContent>

        <TabsContent value="router">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Router className="w-5 h-5" />
                CPE Credentials
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the ONT's management IP as configured on your OLT (not the customer's LAN IP like 192.168.1.1).
                The ONT must be reachable from your server running the MikroTik service.
              </p>
              <div className="space-y-4">
                <div>
                  <Label>CPE Management IP</Label>
                  <Input
                    placeholder="e.g., 10.100.0.15"
                    value={cpeForm.cpe_ip}
                    onChange={(e) => setCpeForm({ ...cpeForm, cpe_ip: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={cpeForm.cpe_port}
                      onChange={(e) => setCpeForm({ ...cpeForm, cpe_port: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                      value={cpeForm.cpe_type}
                      onChange={(e) => setCpeForm({ ...cpeForm, cpe_type: e.target.value })}
                    >
                      <option value="gpon">GPON</option>
                      <option value="epon">EPON</option>
                      <option value="mikrotik">MikroTik</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Username</Label>
                  <Input
                    value={cpeForm.cpe_username}
                    onChange={(e) => setCpeForm({ ...cpeForm, cpe_username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={cpeForm.cpe_password}
                    onChange={(e) => setCpeForm({ ...cpeForm, cpe_password: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveCpe} disabled={cpeLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={testCpe} disabled={cpeLoading || !cpeForm.cpe_ip}>
                    Test Connection
                  </Button>
                </div>
                {cpe?.last_connected && (
                  <p className="text-xs text-muted-foreground">
                    Last connected: {new Date(cpe.last_connected).toLocaleString()}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Signal className="w-5 h-5" />
                Optical Power
              </h3>
              {cpe ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">RX Power</p>
                      <p className={`text-2xl font-bold ${(cpe.last_optical_rx || 0) < -25 ? 'text-red-500' : (cpe.last_optical_rx || 0) < -22 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {cpe.last_optical_rx != null ? `${cpe.last_optical_rx} dBm` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">TX Power</p>
                      <p className="text-2xl font-bold">
                        {cpe.last_optical_tx != null ? `${cpe.last_optical_tx} dBm` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={refreshOptical} disabled={cpeLoading}>
                    <Signal className="w-4 h-4 mr-2" />
                    Refresh Optical Power
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Good: &gt; -22 dBm</p>
                    <p>• Warning: -22 to -25 dBm</p>
                    <p>• Critical: &lt; -25 dBm</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Save CPE credentials first to view optical power</p>
              )}
            </Card>

            {cpe && (
              <Card className="p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  WiFi Settings (Cached)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SSID</Label>
                    <p className="text-lg">{cpe.wifi_ssid || 'Not available'}</p>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <p className="text-lg">{cpe.wifi_password || 'Not available'}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div >
  );
}

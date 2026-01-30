'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabasePlanApi } from '@/lib/supabase-api';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Package, DollarSign, Wifi, Clock } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    upload_speed: '',
    download_speed: '',
    validity_days: '30',
    price: '',
    currency: 'KES',
    data_limit_mb: '',
    session_timeout: '',
    idle_timeout: '',
    is_active: true
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await supabasePlanApi.getAll();
      setPackages(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load packages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...formData,
        upload_speed: formData.upload_speed ? parseInt(formData.upload_speed) : undefined,
        download_speed: formData.download_speed ? parseInt(formData.download_speed) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        validity_days: formData.validity_days ? parseInt(formData.validity_days) : 30,
        data_limit_mb: formData.data_limit_mb ? parseInt(formData.data_limit_mb) : undefined,
        session_timeout: formData.session_timeout ? parseInt(formData.session_timeout) : undefined,
        idle_timeout: formData.idle_timeout ? parseInt(formData.idle_timeout) : undefined
      };

      let savedPackage;
      if (editingPackage) {
        savedPackage = await supabasePlanApi.update(editingPackage.id, payload);
        toast({
          title: 'Success',
          description: 'Package updated successfully'
        });
      } else {
        savedPackage = await supabasePlanApi.create(payload);
        toast({
          title: 'Success',
          description: 'Package created successfully'
        });
      }

      // Auto-sync to MikroTik routers (optional - only if MikroTik service is running)
      const packageId = savedPackage?.id || editingPackage?.id;
      if (packageId) {
        try {
          const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
          const syncResponse = await fetch(`${mikrotikServiceUrl}/api/packages/${packageId}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            if (syncResult.success) {
              toast({
                title: 'MikroTik Synced',
                description: syncResult.message || 'Profile synced to routers'
              });
            }
          }
        } catch (syncError: any) {
          // MikroTik sync is optional - don't show error if service unavailable
          console.log('MikroTik sync skipped:', syncError.message);
        }
      }

      resetForm();
      loadPackages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Operation failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name || '',
      description: pkg.description || '',
      upload_speed: pkg.upload_speed?.toString() || '',
      download_speed: pkg.download_speed?.toString() || '',
      validity_days: pkg.validity_days?.toString() || '30',
      price: pkg.price?.toString() || '',
      currency: pkg.currency || 'KES',
      data_limit_mb: pkg.data_limit_mb?.toString() || '',
      session_timeout: pkg.session_timeout?.toString() || '',
      idle_timeout: pkg.idle_timeout?.toString() || '',
      is_active: pkg.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      await supabasePlanApi.delete(id);
      toast({
        title: 'Success',
        description: 'Package deleted successfully'
      });
      loadPackages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete package',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      upload_speed: '',
      download_speed: '',
      validity_days: '30',
      price: '',
      currency: 'KES',
      data_limit_mb: '',
      session_timeout: '',
      idle_timeout: '',
      is_active: true
    });
    setEditingPackage(null);
    setShowForm(false);
  };

  const formatSpeed = (kbps: number) => {
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(0)} Mbps`;
    }
    return `${kbps} Kbps`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Packages</h1>
          <p className="text-muted-foreground">Manage internet packages and pricing</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          New Package
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingPackage ? 'Edit Package' : 'Create New Package'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 8Mbps Standard"
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Price (KES) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1500"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="download_speed">Download Speed (Kbps) *</Label>
                <Input
                  id="download_speed"
                  type="number"
                  value={formData.download_speed}
                  onChange={(e) => setFormData({ ...formData, download_speed: e.target.value })}
                  placeholder="8192 (8Mbps)"
                  required
                />
              </div>

              <div>
                <Label htmlFor="upload_speed">Upload Speed (Kbps)</Label>
                <Input
                  id="upload_speed"
                  type="number"
                  value={formData.upload_speed}
                  onChange={(e) => setFormData({ ...formData, upload_speed: e.target.value })}
                  placeholder="2048 (2Mbps)"
                />
              </div>

              <div>
                <Label htmlFor="validity_days">Validity (Days)</Label>
                <Input
                  id="validity_days"
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                  placeholder="30"
                />
              </div>

              <div>
                <Label htmlFor="data_limit_mb">Data Limit (MB)</Label>
                <Input
                  id="data_limit_mb"
                  type="number"
                  value={formData.data_limit_mb}
                  onChange={(e) => setFormData({ ...formData, data_limit_mb: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package description"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {editingPackage ? 'Update Package' : 'Create Package'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && packages.length === 0 ? (
        <div className="text-center py-8">Loading packages...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(pkg)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pkg.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {pkg.description && (
                  <p className="text-muted-foreground">{pkg.description}</p>
                )}

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-bold text-lg">
                    {pkg.currency} {pkg.price?.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/ {pkg.validity_days || 30} days</span>
                </div>

                {pkg.download_speed && (
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span>
                      Download: <strong>{formatSpeed(pkg.download_speed)}</strong>
                    </span>
                  </div>
                )}

                {pkg.upload_speed && (
                  <div className="flex items-center gap-2 ml-6">
                    <span>
                      Upload: <strong>{formatSpeed(pkg.upload_speed)}</strong>
                    </span>
                  </div>
                )}

                {pkg.data_limit_mb && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Data Limit: {(pkg.data_limit_mb / 1024).toFixed(1)} GB</span>
                  </div>
                )}

                <div className="pt-2">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded ${pkg.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && packages.length === 0 && !showForm && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No packages found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first internet package to get started
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        </Card>
      )}
    </div>
  );
}

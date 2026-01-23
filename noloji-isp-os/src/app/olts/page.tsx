'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Router, Plus, RefreshCw, Wifi, WifiOff,
    Settings, Trash2, Eye, Activity, Signal
} from 'lucide-react';

interface Olt {
    id: string;
    name: string;
    vendor: string;
    model: string | null;
    management_ip: string;
    status: 'online' | 'offline' | 'error' | 'maintenance';
    last_polled_at: string | null;
    uptime_seconds: number | null;
    mgmt_vlan_id: number;
    created_at: string;
}

export default function OLTManagementPage() {
    const [olts, setOlts] = useState<Olt[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        vendor: 'huawei',
        model: '',
        management_ip: '',
        snmp_port: '161',
        snmp_community: 'public',
        api_port: '',
        api_username: '',
        api_password: '',
        mgmt_vlan_id: '100',
        access_vlan_start: '200',
        access_vlan_end: '4000',
    });

    // In real implementation, get workspace from auth context
    const workspaceId = 'demo-workspace-id';

    const loadOLTs = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/olts?workspace_id=${workspaceId}`);
            const result = await response.json();

            if (response.ok) {
                setOlts(result.data || []);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load OLTs',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOLTs();
    }, []);

    const handleAddOLT = async () => {
        try {
            setLoading(true);

            const response = await fetch('/api/olts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    name: formData.name,
                    vendor: formData.vendor,
                    model: formData.model || null,
                    management_ip: formData.management_ip,
                    snmp_port: parseInt(formData.snmp_port),
                    snmp_community: formData.snmp_community,
                    api_port: formData.api_port ? parseInt(formData.api_port) : null,
                    api_username: formData.api_username || null,
                    api_password: formData.api_password || null,
                    mgmt_vlan_id: parseInt(formData.mgmt_vlan_id),
                    access_vlan_start: parseInt(formData.access_vlan_start),
                    access_vlan_end: parseInt(formData.access_vlan_end),
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast({ title: 'Success', description: 'OLT added successfully' });
                setShowAddDialog(false);
                setFormData({
                    name: '', vendor: 'huawei', model: '', management_ip: '',
                    snmp_port: '161', snmp_community: 'public', api_port: '',
                    api_username: '', api_password: '', mgmt_vlan_id: '100',
                    access_vlan_start: '200', access_vlan_end: '4000',
                });
                loadOLTs();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to add OLT',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOLT = async (id: string, name: string) => {
        if (!confirm(`Delete OLT "${name}"? This will remove all associated ONUs.`)) return;

        try {
            const response = await fetch(`/api/olts/${id}`, { method: 'DELETE' });

            if (response.ok) {
                toast({ title: 'Deleted', description: `${name} removed` });
                loadOLTs();
            } else {
                const result = await response.json();
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-500 bg-green-100 dark:bg-green-900/30';
            case 'offline': return 'text-red-500 bg-red-100 dark:bg-red-900/30';
            case 'error': return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
            case 'maintenance': return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
            default: return 'text-gray-500 bg-gray-100';
        }
    };

    const formatUptime = (seconds: number | null) => {
        if (!seconds) return 'N/A';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Router className="w-8 h-8" />
                        OLT Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage fiber OLT devices and discover ONUs
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadOLTs} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add OLT
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Register New OLT</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Name *</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Main Building OLT"
                                        />
                                    </div>
                                    <div>
                                        <Label>Vendor</Label>
                                        <Select value={formData.vendor} onValueChange={v => setFormData({ ...formData, vendor: v })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="huawei">Huawei</SelectItem>
                                                <SelectItem value="zte">ZTE</SelectItem>
                                                <SelectItem value="fiberhome">FiberHome</SelectItem>
                                                <SelectItem value="vsol">VSOL</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Model</Label>
                                        <Input
                                            value={formData.model}
                                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                                            placeholder="MA5800-X7"
                                        />
                                    </div>
                                    <div>
                                        <Label>Management IP *</Label>
                                        <Input
                                            value={formData.management_ip}
                                            onChange={e => setFormData({ ...formData, management_ip: e.target.value })}
                                            placeholder="192.168.100.1"
                                        />
                                    </div>
                                </div>

                                <hr className="my-2" />
                                <h4 className="font-semibold">SNMP Configuration</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>SNMP Port</Label>
                                        <Input
                                            type="number"
                                            value={formData.snmp_port}
                                            onChange={e => setFormData({ ...formData, snmp_port: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>SNMP Community</Label>
                                        <Input
                                            type="password"
                                            value={formData.snmp_community}
                                            onChange={e => setFormData({ ...formData, snmp_community: e.target.value })}
                                            placeholder="public"
                                        />
                                    </div>
                                </div>

                                <hr className="my-2" />
                                <h4 className="font-semibold">API Credentials (Optional)</h4>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>API Port</Label>
                                        <Input
                                            type="number"
                                            value={formData.api_port}
                                            onChange={e => setFormData({ ...formData, api_port: e.target.value })}
                                            placeholder="8443"
                                        />
                                    </div>
                                    <div>
                                        <Label>Username</Label>
                                        <Input
                                            value={formData.api_username}
                                            onChange={e => setFormData({ ...formData, api_username: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={formData.api_password}
                                            onChange={e => setFormData({ ...formData, api_password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <hr className="my-2" />
                                <h4 className="font-semibold">VLAN Configuration</h4>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Management VLAN</Label>
                                        <Input
                                            type="number"
                                            value={formData.mgmt_vlan_id}
                                            onChange={e => setFormData({ ...formData, mgmt_vlan_id: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Access VLAN Start</Label>
                                        <Input
                                            type="number"
                                            value={formData.access_vlan_start}
                                            onChange={e => setFormData({ ...formData, access_vlan_start: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Access VLAN End</Label>
                                        <Input
                                            type="number"
                                            value={formData.access_vlan_end}
                                            onChange={e => setFormData({ ...formData, access_vlan_end: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Button onClick={handleAddOLT} disabled={loading || !formData.name || !formData.management_ip}>
                                    {loading ? 'Adding...' : 'Add OLT'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <Router className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">Total OLTs</span>
                    </div>
                    <div className="text-2xl font-bold">{olts.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Online</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        {olts.filter(o => o.status === 'online').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">Offline</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                        {olts.filter(o => o.status === 'offline').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-muted-foreground">Errors</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                        {olts.filter(o => o.status === 'error').length}
                    </div>
                </Card>
            </div>

            {/* OLT List */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Name</th>
                                <th className="text-left p-4 font-medium">Vendor</th>
                                <th className="text-left p-4 font-medium">IP Address</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Uptime</th>
                                <th className="text-left p-4 font-medium">VLAN</th>
                                <th className="text-left p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && olts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Loading OLTs...
                                    </td>
                                </tr>
                            ) : olts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No OLTs registered. Click "Add OLT" to get started.
                                    </td>
                                </tr>
                            ) : (
                                olts.map(olt => (
                                    <tr key={olt.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4">
                                            <div className="font-medium">{olt.name}</div>
                                            {olt.model && (
                                                <div className="text-xs text-muted-foreground">{olt.model}</div>
                                            )}
                                        </td>
                                        <td className="p-4 capitalize">{olt.vendor}</td>
                                        <td className="p-4 font-mono text-sm">{olt.management_ip}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(olt.status)}`}>
                                                {olt.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4">{formatUptime(olt.uptime_seconds)}</td>
                                        <td className="p-4">{olt.mgmt_vlan_id}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`/olts/${olt.id}`}>
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        View
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteOLT(olt.id, olt.name)}
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
        </div>
    );
}

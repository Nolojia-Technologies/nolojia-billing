"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Building2,
    Users,
    Router,
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    MoreVertical,
    MapPin,
    Wifi,
    WifiOff,
    DollarSign,
    CheckCircle2,
    AlertTriangle,
    Home,
    Phone,
    Mail,
    Activity,
    Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

// Types
interface Landlord {
    id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    city: string;
    country: string;
    commission_rate: number;
    status: string;
    is_active: boolean;
    created_at: string;
    // Stats from view
    total_buildings?: number;
    total_units?: number;
    active_customers?: number;
    revenue_this_month?: number;
    earnings_this_month?: number;
}

interface Building {
    id: string;
    landlord_id: string;
    name: string;
    address: string;
    city: string;
    total_units: number;
    status: string;
    active_connections?: number; // Calculated/Fetched separately
    occupied_units?: number;     // Calculated/Fetched separately
}

interface RouterItem {
    id: string;
    name: string;
    ip_address: string;
    api_port: number;
    username: string;
    role?: string; // Not in DB schema for router? strict schema check needed. Schema says router_type enum.
    status: string;
    building_id?: string;
    building_name?: string;
    uptime?: string;
    cpu_usage?: number;
    memory_usage?: number;
}

export default function LandlordDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const landlordId = params.id as string;

    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [landlord, setLandlord] = useState<Landlord | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [routers, setRouters] = useState<RouterItem[]>([]);

    // Dialog States
    const [showBuildingDialog, setShowBuildingDialog] = useState(false);
    const [showRouterDialog, setShowRouterDialog] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [editingRouter, setEditingRouter] = useState<RouterItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Forms
    const [buildingForm, setBuildingForm] = useState({
        name: "",
        address: "",
        city: "",
        total_units: ""
    });

    const [routerForm, setRouterForm] = useState({
        name: "",
        ip_address: "",
        api_port: "8728",
        username: "admin",
        password: "",
        building_id: ""
    });

    useEffect(() => {
        if (landlordId) {
            fetchData();
        }
    }, [landlordId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchLandlord(),
                fetchBuildings(),
                fetchRouters()
            ]);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load landlord data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchLandlord = async () => {
        // Fetch base landlord info
        const { data: lData, error: lError } = await supabase
            .from('landlords')
            .select('*')
            .eq('id', landlordId)
            .single();

        if (lError) throw lData;

        // Fetch stats from view if possible
        const { data: sData } = await supabase
            .from('landlord_dashboard_summary')
            .select('*')
            .eq('landlord_id', landlordId)
            .single();

        setLandlord({
            ...lData,
            status: lData.is_active ? 'active' : 'suspended',
            total_buildings: sData?.total_buildings || 0,
            total_units: sData?.total_units || 0,
            active_customers: sData?.active_customers || 0,
            revenue_this_month: sData?.revenue_this_month || 0,
            earnings_this_month: sData?.earnings_this_month || 0
        });
    };

    const fetchBuildings = async () => {
        const { data, error } = await supabase
            .from('landlord_buildings')
            .select('*')
            .eq('landlord_id', landlordId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // For now, assume 0 for calc fields or fetch from a view if available
        // We can create a 'building_occupancy' view usage here if needed
        setBuildings(data.map((b: any) => ({
            ...b,
            active_connections: 0,
            occupied_units: 0
        })));
    };

    const fetchRouters = async () => {
        // This is tricky with Supabase joins, doing a simpler two-step or relying on RPC is better often.
        // But let's try to query assignments first

        // 1. Get building IDs for this landlord
        // We can reuse 'buildings' state if we wait, but let's just query
        const { data: myBuildings } = await supabase.from('landlord_buildings').select('id').eq('landlord_id', landlordId);
        if (!myBuildings || myBuildings.length === 0) {
            setRouters([]);
            return;
        }

        const buildingIds = myBuildings.map(b => b.id);

        // 2. Find assignments for these buildings
        const { data: assignments } = await supabase
            .from('landlord_router_assignments')
            .select('router_id, building_id, landlord_buildings(name)')
            .in('building_id', buildingIds)
            .eq('is_active', true);

        if (!assignments || assignments.length === 0) {
            setRouters([]);
            return;
        }

        const routerIds = assignments.map(a => a.router_id);

        // 3. Fetch routers
        const { data: routersData } = await supabase
            .from('landlord_routers')
            .select('*')
            .in('id', routerIds);

        if (routersData) {
            // Merge with building info
            const merged = routersData.map((r: any) => {
                const assign = assignments.find((a: any) => a.router_id === r.id);
                // @ts-ignore
                const bName = assign?.landlord_buildings?.name;
                return {
                    ...r,
                    building_id: assign?.building_id,
                    building_name: bName,
                    role: 'mikrotik' // Default/Placeholder as schema calls it router_type
                };
            });
            setRouters(merged);
        }
    };

    // --- Building CRUD ---

    const handleSaveBuilding = async () => {
        if (!buildingForm.name || !buildingForm.total_units) {
            toast({ title: "Error", description: "Name and Total Units are required", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: buildingForm.name,
                address: buildingForm.address,
                city: buildingForm.city,
                total_units: parseInt(buildingForm.total_units),
                landlord_id: landlordId
            };

            if (editingBuilding) {
                const { error } = await supabase
                    .from('landlord_buildings')
                    .update(payload)
                    .eq('id', editingBuilding.id);
                if (error) throw error;
                toast({ title: "Success", description: "Building updated" });
            } else {
                const { error } = await supabase
                    .from('landlord_buildings')
                    .insert([payload]);
                if (error) throw error;
                toast({ title: "Success", description: "Building created" });
            }

            setShowBuildingDialog(false);
            fetchBuildings(); // Refresh
            fetchLandlord(); // Refresh stats
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBuilding = async (id: string) => {
        if (!confirm("Are you sure? This will delete all units and tenant data associated.")) return;

        try {
            const { error } = await supabase.from('landlord_buildings').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted", description: "Building removed" });
            fetchBuildings();
            fetchLandlord();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    // --- Router CRUD ---

    const handleSaveRouter = async () => {
        if (!routerForm.name || !routerForm.ip_address || !routerForm.building_id) {
            toast({ title: "Error", description: "Name, IP, and Building are required", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            let routerId = editingRouter?.id;

            // 1. Upsert Router
            const routerPayload = {
                name: routerForm.name,
                ip_address: routerForm.ip_address,
                api_port: parseInt(routerForm.api_port),
                username: routerForm.username,
                ...(routerForm.password ? { password: routerForm.password } : {}), // Only update password if provided
                router_type: 'mikrotik',
                status: 'unknown'
            };

            if (editingRouter) {
                const { error } = await supabase
                    .from('landlord_routers')
                    .update(routerPayload)
                    .eq('id', routerId);
                if (error) throw error;
            } else {
                // Must ensure password is provided for new
                if (!routerForm.password) throw new Error("Password required for new router");

                const { data, error } = await supabase
                    .from('landlord_routers')
                    .insert([routerPayload])
                    .select()
                    .single();
                if (error) throw error;
                routerId = data.id;
            }

            // 2. Upsert Assignment
            // If editing, check if building changed. If so, update assignment.
            // Simplified: Just upsert the assignment for this router + building pair?
            // Actually, a router can only be in one building usually? The unique constraint is (router_id, building_id).
            // But if we move a router, we should delete old assignment?
            // For now, let's assume we just create a new assignment link.
            // Ideally we'd remove old assignments for this router if we want 1-to-1.

            if (editingRouter) {
                // Delete all assignments for this router first (simplest 'move' logic)
                await supabase.from('landlord_router_assignments').delete().eq('router_id', routerId);
            }

            const { error: assignError } = await supabase
                .from('landlord_router_assignments')
                .insert([{
                    router_id: routerId,
                    building_id: routerForm.building_id,
                    is_active: true
                }]);

            if (assignError) throw assignError;

            toast({ title: "Success", description: "Router saved" });
            setShowRouterDialog(false);
            fetchRouters();

        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRouter = async (id: string) => {
        if (!confirm("Delete this router? usage stats will be lost.")) return;
        try {
            // Deleting router cascades to assignments usually
            const { error } = await supabase.from('landlord_routers').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted", description: "Router removed" });
            fetchRouters();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };


    // Helpers
    const openAddBuilding = () => {
        setEditingBuilding(null);
        setBuildingForm({ name: "", address: "", city: "", total_units: "" });
        setShowBuildingDialog(true);
    };

    const openEditBuilding = (b: Building) => {
        setEditingBuilding(b);
        setBuildingForm({
            name: b.name,
            address: b.address || "",
            city: b.city || "",
            total_units: b.total_units.toString()
        });
        setShowBuildingDialog(true);
    };

    const openAddRouter = () => {
        setEditingRouter(null);
        setRouterForm({
            name: "",
            ip_address: "",
            api_port: "8728",
            username: "admin",
            password: "",
            building_id: "" // For 'Add', user must pick
        });
        setShowRouterDialog(true);
    };

    const openEditRouter = (r: RouterItem) => {
        setEditingRouter(r);
        setRouterForm({
            name: r.name,
            ip_address: r.ip_address,
            api_port: r.api_port.toString(),
            username: r.username,
            password: "", // Don't show existing password
            building_id: r.building_id || ""
        });
        setShowRouterDialog(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        // ... implementation same as before
        if (status === 'active' || status === 'online')
            return <Badge className="bg-green-100 text-green-700">Active</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    };

    if (loading && !landlord) {
        return <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!landlord) {
        return <div className="p-10 text-center">Landlord not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {landlord.contact_name}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {landlord.city}, {landlord.country}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(landlord.status)}
                    <Badge variant="outline">{landlord.commission_rate}% Commission</Badge>
                </div>
            </div>

            {/* Contact Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Contact</p>
                                <p className="font-medium">{landlord.contact_name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium">{landlord.contact_phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* ... Email ... */}
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                <Mail className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{landlord.contact_email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                                <MapPin className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Address</p>
                                <p className="font-medium">{landlord.address || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="buildings">Buildings</TabsTrigger>
                    <TabsTrigger value="routers">Routers</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Buildings</p>
                                        <p className="text-3xl font-bold">{landlord.total_buildings}</p>
                                    </div>
                                    <Building2 className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Relative Units</p>
                                        <p className="text-3xl font-bold">{landlord.total_units}</p>
                                    </div>
                                    <Home className="h-8 w-8 text-purple-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Active Conn.</p>
                                        <p className="text-3xl font-bold text-green-600">{landlord.active_customers}</p>
                                    </div>
                                    <Wifi className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
                            <CardContent className="p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-orange-100 text-sm">Revenue (Mo)</p>
                                        <p className="text-2xl font-bold">{formatCurrency(landlord.revenue_this_month || 0)}</p>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-white/80" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="buildings" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Buildings</h2>
                        <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-orange-600 hover:bg-orange-700" onClick={openAddBuilding}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Building
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingBuilding ? "Edit Building" : "New Building"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Name *</Label>
                                        <Input value={buildingForm.name} onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Address</Label>
                                        <Input value={buildingForm.address} onChange={e => setBuildingForm({ ...buildingForm, address: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>City</Label>
                                            <Input value={buildingForm.city} onChange={e => setBuildingForm({ ...buildingForm, city: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Total Units *</Label>
                                            <Input type="number" value={buildingForm.total_units} onChange={e => setBuildingForm({ ...buildingForm, total_units: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowBuildingDialog(false)}>Cancel</Button>
                                    <Button onClick={handleSaveBuilding} disabled={submitting}>
                                        {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Save
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Name</th>
                                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Units</th>
                                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {buildings.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-8 text-gray-500">No buildings</td></tr>
                                    ) : buildings.map(b => (
                                        <tr key={b.id}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="h-4 w-4 text-blue-600" /></div>
                                                    <div>
                                                        <p className="font-medium">{b.name}</p>
                                                        <p className="text-xs text-gray-500">{b.address}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">{b.total_units}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditBuilding(b)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteBuilding(b.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="routers" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Routers</h2>
                            <p className="text-sm text-gray-500">Routers assigned to this landlord&apos;s buildings</p>
                        </div>
                        <Dialog open={showRouterDialog} onOpenChange={setShowRouterDialog}>
                            <DialogTrigger asChild>
                                <Button className="bg-orange-600 hover:bg-orange-700" onClick={openAddRouter}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Router
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingRouter ? "Edit Router" : "Add Router"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Name *</Label>
                                            <Input value={routerForm.name} onChange={e => setRouterForm({ ...routerForm, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>IP Address *</Label>
                                            <Input value={routerForm.ip_address} onChange={e => setRouterForm({ ...routerForm, ip_address: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Port</Label>
                                            <Input type="number" value={routerForm.api_port} onChange={e => setRouterForm({ ...routerForm, api_port: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Username</Label>
                                            <Input value={routerForm.username} onChange={e => setRouterForm({ ...routerForm, username: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password {editingRouter ? '(leave blank to keep)' : '*'}</Label>
                                        <Input type="password" value={routerForm.password} onChange={e => setRouterForm({ ...routerForm, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assign to Building *</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                            value={routerForm.building_id}
                                            onChange={e => setRouterForm({ ...routerForm, building_id: e.target.value })}
                                        >
                                            <option value="">-- Select Building --</option>
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowRouterDialog(false)}>Cancel</Button>
                                    <Button onClick={handleSaveRouter} disabled={submitting}>
                                        {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Save
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {routers.length === 0 ? (
                            <Card className="col-span-full p-8 text-center text-gray-500">
                                <p>No routers found. Add a building first, then assign a router.</p>
                            </Card>
                        ) : routers.map(r => (
                            <Card key={r.id}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 rounded-lg"><Router className="h-5 w-5 text-gray-600" /></div>
                                            <div>
                                                <h3 className="font-semibold">{r.name}</h3>
                                                <p className="text-sm text-gray-500">{r.ip_address}</p>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditRouter(r)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteRouter(r.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Building</span>
                                            <span className="font-medium">{r.building_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Status</span>
                                            <Badge variant={r.status === 'online' ? 'default' : 'secondary'}>{r.status}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

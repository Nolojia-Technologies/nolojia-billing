"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Building2,
    MoreVertical,
    Plus,
    Search,
    Globe,
    Users,
    CreditCard,
    CheckCircle2,
    XCircle,
    Loader2,
    Mail,
    Phone,
    Eye,
    Edit,
    UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import type { User, Organization } from "@/types/landlord";

interface ISPUser extends User {
    // Stats computed for each ISP
    total_customers?: number;
    total_revenue?: number;
    active_customers?: number;
}

export default function AdminISPsPage() {
    const { toast } = useToast();
    const [isps, setIsps] = useState<ISPUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchISPs();
    }, []);

    const fetchISPs = async () => {
        setLoading(true);
        try {
            // Fetch ISP users via API (bypasses RLS issues)
            const response = await fetch('/api/admin/users?role=full_isp');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch ISPs');
            }

            const ispUsers = data.users || [];
            console.log("Found ISP users:", ispUsers);

            // Add placeholder stats (stats can be fetched separately if needed)
            const ispsWithStats = ispUsers.map((user: ISPUser) => ({
                ...user,
                total_customers: 0,
                active_customers: 0,
                total_revenue: 0,
            }));

            setIsps(ispsWithStats);

        } catch (error: any) {
            console.error("Error fetching ISPs:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load ISPs",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredISPs = isps.filter(isp =>
        (isp.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (isp.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const handleSuspendISP = async (ispId: string) => {
        try {
            const { error } = await supabase
                .from('landlord_users')
                .update({ is_active: false })
                .eq('id', ispId);

            if (error) throw error;

            toast({
                title: "ISP Suspended",
                description: "The ISP account has been suspended.",
            });

            fetchISPs();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to suspend ISP",
                variant: "destructive"
            });
        }
    };

    const handleActivateISP = async (ispId: string) => {
        try {
            const { error } = await supabase
                .from('landlord_users')
                .update({ is_active: true })
                .eq('id', ispId);

            if (error) throw error;

            toast({
                title: "ISP Activated",
                description: "The ISP account has been activated.",
            });

            fetchISPs();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to activate ISP",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ISP Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage Internet Service Providers and their performance</p>
                </div>
                <Link href="/admin/isps/new">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New ISP
                    </Button>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total ISPs</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isps.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {isps.filter(i => i.is_active).length} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isps.reduce((acc, isp) => acc + (isp.total_customers || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all ISPs
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isps.reduce((acc, isp) => acc + (isp.active_customers || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Currently online
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatMoney(isps.reduce((acc, isp) => acc + (isp.total_revenue || 0), 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ecosystem total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>ISP Directory</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search ISPs..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ISP Account</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Customers</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredISPs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Globe className="h-8 w-8 text-gray-300" />
                                                <p>No ISP accounts found.</p>
                                                <p className="text-sm">ISP accounts are users with the "full_isp" role.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredISPs.map((isp) => (
                                        <TableRow key={isp.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                                                        {(isp.full_name || isp.email || 'ISP').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{isp.full_name || 'Unnamed ISP'}</p>
                                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {isp.email}
                                                            </span>
                                                            {isp.phone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    {isp.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isp.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Suspended
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{isp.total_customers || 0}</p>
                                                    <p className="text-xs text-gray-500">{isp.active_customers || 0} active</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatMoney(isp.total_revenue || 0)}</TableCell>
                                            <TableCell>
                                                {isp.last_login
                                                    ? new Date(isp.last_login).toLocaleDateString()
                                                    : <span className="text-gray-400">Never</span>
                                                }
                                            </TableCell>
                                            <TableCell>{new Date(isp.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/isps/${isp.id}`}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Dashboard
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/isps/${isp.id}/edit`}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit Account
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {isp.is_active ? (
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() => handleSuspendISP(isp.id)}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-2" />
                                                                Suspend Account
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-green-600"
                                                                onClick={() => handleActivateISP(isp.id)}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                                Activate Account
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

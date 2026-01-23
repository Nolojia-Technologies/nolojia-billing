"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Globe,
    Users,
    CreditCard,
    CheckCircle2,
    XCircle,
    Loader2,
    Mail,
    Phone,
    Edit,
    Calendar,
    TrendingUp,
    TrendingDown,
    Activity,
    BarChart3,
    RefreshCw,
    Building2,
    Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
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
import type { User } from "@/types/landlord";

interface ISPStats {
    total_customers: number;
    active_customers: number;
    suspended_customers: number;
    total_revenue: number;
    revenue_this_month: number;
    revenue_last_month: number;
    total_payments: number;
    payments_this_month: number;
}

interface RecentCustomer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    status: string;
    created_at: string;
    package_name?: string;
}

interface RecentPayment {
    id: string;
    amount: number;
    status: string;
    payment_method: string;
    customer_name?: string;
    created_at: string;
}

export default function ISPDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const ispId = params.id as string;

    const [isp, setIsp] = useState<User | null>(null);
    const [stats, setStats] = useState<ISPStats | null>(null);
    const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
    const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (ispId) {
            fetchISPData();
        }
    }, [ispId]);

    const fetchISPData = async () => {
        setLoading(true);
        try {
            // Fetch ISP user details via API (bypasses RLS)
            const response = await fetch(`/api/admin/users/${ispId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch ISP');
            }

            setIsp(data.user);

            // Fetch stats - try different tables that might exist
            const statsData: ISPStats = {
                total_customers: 0,
                active_customers: 0,
                suspended_customers: 0,
                total_revenue: 0,
                revenue_this_month: 0,
                revenue_last_month: 0,
                total_payments: 0,
                payments_this_month: 0,
            };

            try {
                // Try customers table
                const { count: totalCustomers } = await supabase
                    .from('customers')
                    .select('id', { count: 'exact', head: true });
                statsData.total_customers = totalCustomers || 0;

                const { count: activeCustomers } = await supabase
                    .from('customers')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'active');
                statsData.active_customers = activeCustomers || 0;

                const { count: suspendedCustomers } = await supabase
                    .from('customers')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'suspended');
                statsData.suspended_customers = suspendedCustomers || 0;

                // Payments
                const { data: allPayments } = await supabase
                    .from('payments')
                    .select('amount, created_at')
                    .eq('status', 'completed');

                if (allPayments) {
                    statsData.total_revenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    statsData.total_payments = allPayments.length;

                    const now = new Date();
                    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

                    statsData.revenue_this_month = allPayments
                        .filter(p => new Date(p.created_at) >= thisMonth)
                        .reduce((sum, p) => sum + (p.amount || 0), 0);

                    statsData.revenue_last_month = allPayments
                        .filter(p => {
                            const date = new Date(p.created_at);
                            return date >= lastMonth && date <= lastMonthEnd;
                        })
                        .reduce((sum, p) => sum + (p.amount || 0), 0);

                    statsData.payments_this_month = allPayments
                        .filter(p => new Date(p.created_at) >= thisMonth)
                        .length;
                }
            } catch (e) {
                console.log("Stats tables not available:", e);
            }

            setStats(statsData);

            // Fetch recent customers
            try {
                const { data: customers } = await supabase
                    .from('customers')
                    .select('id, name, phone, email, status, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setRecentCustomers(customers || []);
            } catch (e) {
                console.log("Could not fetch customers:", e);
            }

            // Fetch recent payments
            try {
                const { data: payments } = await supabase
                    .from('payments')
                    .select('id, amount, status, payment_method, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setRecentPayments(payments || []);
            } catch (e) {
                console.log("Could not fetch payments:", e);
            }

        } catch (error: any) {
            console.error("Error fetching ISP data:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load ISP data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const getRevenueChange = () => {
        if (!stats?.revenue_last_month) return null;
        const change = ((stats.revenue_this_month - stats.revenue_last_month) / stats.revenue_last_month) * 100;
        return change;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    if (!isp) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">ISP not found</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        );
    }

    const revenueChange = getRevenueChange();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                            {(isp.full_name || isp.email || 'ISP').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {isp.full_name || 'Unnamed ISP'}
                                {isp.is_active ? (
                                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                                ) : (
                                    <Badge className="bg-red-100 text-red-700">Suspended</Badge>
                                )}
                            </h1>
                            <div className="flex items-center gap-4 text-gray-500 text-sm">
                                <span className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {isp.email}
                                </span>
                                {isp.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-4 w-4" />
                                        {isp.phone}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Since {new Date(isp.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchISPData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Link href={`/admin/isps/${ispId}/edit`}>
                        <Button>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit ISP
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.active_customers || 0} active, {stats?.suspended_customers || 0} suspended
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(stats?.revenue_this_month || 0)}</div>
                        {revenueChange !== null && (
                            <p className={`text-xs flex items-center gap-1 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {revenueChange >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                ) : (
                                    <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(revenueChange).toFixed(1)}% from last month
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(stats?.total_revenue || 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            All time
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.active_customers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently online
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Customers */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-400" />
                                Recent Customers
                            </CardTitle>
                            <Link href={`/customers`}>
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentCustomers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No customers yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableBody>
                                    {recentCustomers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{customer.name}</p>
                                                    <p className="text-sm text-gray-500">{customer.phone || customer.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {customer.status === 'active' ? (
                                                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700">{customer.status}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-gray-500">
                                                {new Date(customer.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Payments */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-gray-400" />
                                Recent Payments
                            </CardTitle>
                            <Link href={`/payments`}>
                                <Button variant="ghost" size="sm">View All</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentPayments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No payments yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableBody>
                                    {recentPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{formatMoney(payment.amount)}</p>
                                                    <p className="text-sm text-gray-500 capitalize">{payment.payment_method}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {payment.status === 'completed' ? (
                                                    <Badge className="bg-green-100 text-green-700">Completed</Badge>
                                                ) : payment.status === 'pending' ? (
                                                    <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700">{payment.status}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-gray-500">
                                                {new Date(payment.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                    <CardDescription>
                        Manage this ISP's resources and settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-4">
                        <Link href="/customers">
                            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                                <Users className="h-6 w-6" />
                                <span>Manage Customers</span>
                            </Button>
                        </Link>
                        <Link href="/network">
                            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                                <Wifi className="h-6 w-6" />
                                <span>Network Status</span>
                            </Button>
                        </Link>
                        <Link href="/payments">
                            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                                <CreditCard className="h-6 w-6" />
                                <span>View Payments</span>
                            </Button>
                        </Link>
                        <Link href={`/admin/isps/${ispId}/edit`}>
                            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                                <Edit className="h-6 w-6" />
                                <span>Edit Account</span>
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

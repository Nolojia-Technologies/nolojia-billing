"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DollarSign,
    TrendingUp,
    Users,
    Building2,
    Download,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    CreditCard,
    Banknote,
    Smartphone,
    FileText,
    Calendar,
    Send,
    Eye,
    Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { LandlordPayoutDB } from "@/types/landlord-db";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Interface for the view data
interface LandlordSummary {
    landlord_id: string;
    organization_id: string;
    contact_name: string;
    total_buildings: number;
    total_units: number;
    active_customers: number;
    total_revenue: number;
    total_earnings: number;
}

export default function AdminLandlordsBillingPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Data states
    const [summaries, setSummaries] = useState<LandlordSummary[]>([]);
    const [payouts, setPayouts] = useState<LandlordPayoutDB[]>([]);

    // Derived stats
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalCommission: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        landlordCount: 0,
        activeCustomers: 0
    });

    // Payout Dialog State
    const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
    const [processingPayout, setProcessingPayout] = useState(false);
    const [selectedLandlordForPayout, setSelectedLandlordForPayout] = useState<LandlordSummary | null>(null);
    const [payoutForm, setPayoutForm] = useState({
        amount: "",
        method: "mpesa",
        reference: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Landlord Summaries (Revenue & Earnings)
            const { data: summaryData, error: summaryError } = await supabase
                .from('landlord_dashboard_summary')
                .select('*');

            if (summaryError) throw summaryError;

            // 2. Fetch Payout History
            const { data: payoutData, error: payoutError } = await supabase
                .from('landlord_payouts')
                .select('*')
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            // 3. Process Data
            const summaries = summaryData as LandlordSummary[];
            const payouts = payoutData as LandlordPayoutDB[];

            // Aggregate Payouts by Landlord to calculate Pending
            const payoutsByLandlord: Record<string, number> = {};
            let totalPaidOut = 0;

            payouts.forEach(p => {
                if (p.status === 'completed') {
                    payoutsByLandlord[p.landlord_id] = (payoutsByLandlord[p.landlord_id] || 0) + p.payout_amount;
                    totalPaidOut += p.payout_amount;
                }
            });

            // Calculate Totals
            const totalRevenue = summaries.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
            const totalEarnings = summaries.reduce((sum, item) => sum + (item.total_earnings || 0), 0); // Landlord share
            const totalCommission = totalRevenue - totalEarnings; // Approx if not stored directly
            const activeCustomers = summaries.reduce((sum, item) => sum + (item.active_customers || 0), 0);

            // Pending = Total Earnings (what they should get) - Total Paid Out
            // Note: This assumes total_earnings tracks lifetime earnings. 
            // If it tracks current balance, then Pending is just total_earnings. 
            // Assuming 'total_earnings' in view is LIFETIME earnings based on typical ledger patterns.
            let pendingPayouts = 0;
            summaries.forEach(s => {
                const paid = payoutsByLandlord[s.landlord_id] || 0;
                const pending = (s.total_earnings || 0) - paid;
                if (pending > 0) pendingPayouts += pending;
            });

            setSummaries(summaries);
            setPayouts(payouts);
            setStats({
                totalRevenue,
                totalCommission,
                totalPayouts: totalPaidOut,
                pendingPayouts,
                landlordCount: summaries.length,
                activeCustomers
            });

        } catch (error: any) {
            console.error("Error fetching billing data:", error);
            toast({
                title: "Error",
                description: "Failed to load billing data: " + error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
            case "processing":
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>;
            case "pending":
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
            case "failed":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Calculate pending for a specific landlord
    const getLandlordPending = (landlordId: string, totalEarnings: number) => {
        const paid = payouts
            .filter(p => p.landlord_id === landlordId && p.status === 'completed')
            .reduce((sum, p) => sum + p.payout_amount, 0);
        return Math.max(0, totalEarnings - paid);
    };

    const handleOpenPayoutDialog = (landlord: LandlordSummary) => {
        const pending = getLandlordPending(landlord.landlord_id, landlord.total_earnings);
        setSelectedLandlordForPayout(landlord);
        setPayoutForm({
            amount: pending.toString(),
            method: "mpesa",
            reference: ""
        });
        setPayoutDialogOpen(true);
    };

    const submitPayout = async () => {
        if (!selectedLandlordForPayout) return;
        setProcessingPayout(true);
        try {
            const amount = parseFloat(payoutForm.amount);
            if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

            const { error } = await supabase.from('landlord_payouts').insert({
                landlord_id: selectedLandlordForPayout.landlord_id,
                payout_amount: amount,
                payout_method: payoutForm.method,
                payout_reference: payoutForm.reference,
                status: 'completed', // Direct complete for manual entry
                processed_at: new Date().toISOString()
            });

            if (error) throw error;

            toast({
                title: "Payout Recorded",
                description: `Successfully recorded payout of ${formatCurrency(amount)} for ${selectedLandlordForPayout.contact_name}`
            });
            setPayoutDialogOpen(false);
            fetchData(); // Refresh data
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to record payout: " + error.message,
                variant: "destructive"
            });
        } finally {
            setProcessingPayout(false);
        }
    };

    // Calculate monthly payouts for chart
    const getMonthlyPayouts = () => {
        const monthlyData: Record<string, number> = {};
        payouts.forEach(p => {
            const month = new Date(p.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyData[month] = (monthlyData[month] || 0) + p.payout_amount;
        });
        // Sort keys effectively or just take last 6
        return Object.entries(monthlyData).slice(0, 6).map(([month, amount]) => ({ month, amount }));
    };
    const monthlyPayoutStats = getMonthlyPayouts();

    const handleExport = () => {
        // Simple CSV export of Landlord Summary
        const headers = ["Landlord", "Buildings", "Units", "Active Customers", "Total Revenue", "Total Earnings", "Status"];
        const csvContent = [
            headers.join(","),
            ...summaries.map(l => [
                l.contact_name,
                l.total_buildings,
                l.total_units,
                l.active_customers,
                l.total_revenue,
                l.total_earnings,
                "Active" // Placeholder for status if not in view
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `landlord_billing_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Billing & Revenue
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage landlord payouts and track revenue
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setActiveTab('payouts')}>
                        <Send className="h-4 w-4 mr-2" />
                        Process Payouts
                    </Button>
                </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                                <p className="text-xs text-green-600 flex items-center mt-1">
                                    <ArrowUpRight className="h-3 w-3 mr-1" />
                                    +5% (Simulated)
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Nolojia Commission</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Approx. Share
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                                <DollarSign className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Payouts</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalPayouts)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.landlordCount} landlords
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                <Banknote className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100 text-sm">Pending Payouts</p>
                                <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayouts)}</p>
                                <p className="text-xs text-amber-100 mt-1">
                                    Requires processing
                                </p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-full">
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="landlords">By Landlord</TabsTrigger>
                    <TabsTrigger value="payouts">Payouts</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Payout Trend Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Payout Trends
                            </CardTitle>
                            <CardDescription>Monthly payout history</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {monthlyPayoutStats.length > 0 ? (
                                <div className="space-y-4">
                                    {monthlyPayoutStats.map((item) => {
                                        const maxAmount = Math.max(...monthlyPayoutStats.map(m => m.amount));
                                        const percent = (item.amount / maxAmount) * 100;
                                        return (
                                            <div key={item.month} className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="font-medium">{item.month}</span>
                                                    <span className="text-gray-500">
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                </div>
                                                <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No enough data for trends yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                        <Users className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                                        <p className="text-sm text-gray-500">Active Customers</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg">
                                        <Building2 className="h-6 w-6 text-cyan-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.landlordCount}</p>
                                        <p className="text-sm text-gray-500">Active Landlords</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">100%</p>
                                        <p className="text-sm text-gray-500">System Uptime</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Landlords Tab */}
                <TabsContent value="landlords" className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search landlords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Landlord</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Revenue</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Earnings</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Pending</th>
                                            <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {summaries.filter(l => l.contact_name.toLowerCase().includes(searchQuery.toLowerCase())).map((landlord) => {
                                            const pending = getLandlordPending(landlord.landlord_id, landlord.total_earnings);
                                            return (
                                                <tr key={landlord.landlord_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                                                                <span className="text-sm font-medium text-orange-600">
                                                                    {landlord.contact_name.substring(0, 2).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{landlord.contact_name}</p>
                                                                <p className="text-xs text-gray-500">{landlord.total_buildings} buildings</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium">
                                                        {formatCurrency(landlord.total_revenue)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-green-600">
                                                        {formatCurrency(landlord.total_earnings)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {pending > 0 ? (
                                                            <span className="text-amber-600 font-medium">
                                                                {formatCurrency(pending)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleOpenPayoutDialog(landlord)}>
                                                                    <Send className="h-4 w-4 mr-2" />
                                                                    Process Payout
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payouts Tab */}
                <TabsContent value="payouts" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input placeholder="Search payouts..." className="pl-10 w-64" />
                            </div>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {payouts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No payout history found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Landlord</th>
                                                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Amount</th>
                                                <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Method</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Reference</th>
                                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Date</th>
                                                <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {payouts.map((payout) => {
                                                const landlordName = summaries.find(s => s.landlord_id === payout.landlord_id)?.contact_name || 'Unknown';
                                                return (
                                                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                        <td className="px-6 py-4 font-medium">{landlordName}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                                            {formatCurrency(payout.payout_amount)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="capitalize text-sm">{payout.payout_method || '-'}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {payout.payout_reference || "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{new Date(payout.created_at).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {getStatusBadge(payout.status)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Monthly Revenue Report</h3>
                                        <p className="text-sm text-gray-500">Revenue breakdown by landlord</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Last generated: Today</span>
                                    <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4 mr-1" />
                                        Export
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                        <Banknote className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Payout Reconciliation</h3>
                                        <p className="text-sm text-gray-500">All payouts with references</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Last generated: Yesterday</span>
                                    <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4 mr-1" />
                                        Export
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payout</DialogTitle>
                        <DialogDescription>
                            Record a payout for {selectedLandlordForPayout?.contact_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Amount (KES)</Label>
                            <Input
                                type="number"
                                value={payoutForm.amount}
                                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select
                                value={payoutForm.method}
                                onValueChange={(v) => setPayoutForm({ ...payoutForm, method: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mpesa">M-PESA</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Reference Code</Label>
                            <Input
                                placeholder="e.g. QK78..."
                                value={payoutForm.reference}
                                onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={submitPayout}
                            disabled={processingPayout}
                        >
                            {processingPayout ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Record Payout"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

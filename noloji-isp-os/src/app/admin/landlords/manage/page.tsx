"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Plus,
  Building2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface Landlord {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  commission_rate: number;
  status: string; // mapped from is_active
  is_active: boolean;
  created_at: string;
  buildings_count?: number;
  customers_count?: number;
  revenue?: number;
}

export default function ManageLandlordsPage() {
  const { toast } = useToast();
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Landlord Form State
  const [formData, setFormData] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    commission_rate: "30",
  });

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    try {
      setLoading(true);
      // Fetch landlords
      const { data: landlordsData, error: landlordsError } = await supabase
        .from('landlords')
        .select('*')
        .order('created_at', { ascending: false });

      if (landlordsError) throw landlordsError;

      // In a real app we might want to join these or use the view, 
      // but for now let's just get the list to ensure basic functionality
      // We can enhance with stats later or in a separate call
      const formattedLandlords = landlordsData.map((l: any) => ({
        ...l,
        status: l.is_active ? 'active' : 'suspended',
        // Default stats for now until we hook up the view
        buildings_count: 0,
        customers_count: 0,
        revenue: 0
      }));

      setLandlords(formattedLandlords);

      // Try to fetch stats if the view exists
      try {
        const { data: stats } = await supabase.from('landlord_dashboard_summary').select('*');
        if (stats) {
          setLandlords(prev => prev.map(l => {
            const stat = stats.find((s: any) => s.landlord_id === l.id);
            return stat ? {
              ...l,
              buildings_count: stat.total_buildings,
              customers_count: stat.total_customers,
              revenue: stat.revenue_this_month
            } : l;
          }));
        }
      } catch (e) {
        console.log("Dashboard view might not exist yet", e);
      }

    } catch (error: any) {
      console.error('Error fetching landlords:', error);
      toast({
        title: "Error",
        description: "Failed to load landlords",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLandlord = async () => {
    if (!formData.contact_name || !formData.contact_email) {
      toast({
        title: "Validation Error",
        description: "Name and Email are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const newLandlord = {
        organization_id: '00000000-0000-0000-0000-000000000001', // Nolojia ID
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: formData.address,
        city: formData.city,
        commission_rate: parseFloat(formData.commission_rate) || 30,
        payout_method: 'mpesa', // default
        is_active: true
      };

      const { data, error } = await supabase
        .from('landlords')
        .insert([newLandlord])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Landlord added successfully",
      });

      setLandlords([{ ...data, status: 'active', buildings_count: 0, customers_count: 0, revenue: 0 }, ...landlords]);
      setShowAddDialog(false);
      setFormData({
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        city: "",
        commission_rate: "30",
      });

    } catch (error: any) {
      console.error('Error adding landlord:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add landlord",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLandlords = landlords.filter(landlord => {
    const matchesSearch = landlord.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlord.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || landlord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-700">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Landlords
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create and manage landlord accounts
          </p>
        </div>

        <Link href="/admin/landlords/manage/new">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Landlord
          </Button>
        </Link>

        {/* Keep dialog for quick add option */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild className="hidden">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Landlord</DialogTitle>
              <DialogDescription>
                Create a new landlord account. They will receive an email to set up their password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Name *</Label>
                <Input
                  id="name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddLandlord} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Landlord
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Landlords</p>
                <p className="text-2xl font-bold">{loading ? "..." : landlords.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : landlords.filter(l => l.status === 'active').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {loading ? "..." : landlords.filter(l => l.status === 'pending').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Suspended</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : landlords.filter(l => l.status === 'suspended').length}
                </p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, contact, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Landlords Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Landlord</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Buildings</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Customers</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Revenue</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Commission</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                        <span className="ml-2 text-gray-500">Loading landlords...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLandlords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No landlords found
                    </td>
                  </tr>
                ) : (
                  filteredLandlords.map((landlord) => (
                    <tr key={landlord.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-orange-600">
                              {(landlord.contact_name || 'U').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {landlord.contact_name}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {landlord.contact_phone || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {landlord.contact_email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {landlord.buildings_count || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {landlord.customers_count || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {formatCurrency(landlord.revenue || 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline">{landlord.commission_rate}%</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(landlord.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin/landlords/manage/${landlord.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/landlords/manage/${landlord.id}?tab=buildings`}>
                              <DropdownMenuItem>
                                <Building2 className="h-4 w-4 mr-2" />
                                Manage Buildings
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div >

          {
            filteredLandlords.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No landlords found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )
          }
        </CardContent >
      </Card >
    </div >
  );
}

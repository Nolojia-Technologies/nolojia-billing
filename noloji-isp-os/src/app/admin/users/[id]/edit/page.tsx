"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Globe,
} from "lucide-react";
import { userManagementService, UpdateUserInput } from "@/services/user-management-service";
import type { User as UserType, UserRole, Organization, Landlord } from "@/types/landlord";
import { supabase } from "@/lib/supabase";

const roleOptions: { value: UserRole; label: string; icon: React.ReactNode }[] = [
  { value: "super_admin", label: "Super Admin", icon: <Shield className="h-4 w-4 text-red-600" /> },
  { value: "nolojia_staff", label: "Nolojia Staff", icon: <Shield className="h-4 w-4 text-orange-600" /> },
  { value: "full_isp", label: "ISP Partner", icon: <Globe className="h-4 w-4 text-blue-600" /> },
  { value: "landlord_admin", label: "Landlord Admin", icon: <Building2 className="h-4 w-4 text-green-600" /> },
  { value: "landlord_staff", label: "Landlord Staff", icon: <User className="h-4 w-4 text-gray-600" /> },
];

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);

  const [formData, setFormData] = useState<UpdateUserInput>({
    full_name: "",
    phone: "",
    role: "landlord_staff",
    organization_id: undefined,
    landlord_id: undefined,
    is_active: true,
  });

  // Fetch user and related data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user
        const userData = await userManagementService.getUserById(userId);
        if (userData) {
          setUser(userData);
          setFormData({
            full_name: userData.full_name || "",
            phone: userData.phone || "",
            role: userData.role,
            organization_id: userData.organization_id || undefined,
            landlord_id: userData.landlord_id || undefined,
            is_active: userData.is_active,
          });
        }

        // Fetch organizations
        const { data: orgs } = await supabase
          .from("organizations")
          .select("*")
          .order("name");
        if (orgs) setOrganizations(orgs);

        // Fetch landlords
        const { data: lands } = await supabase
          .from("landlords")
          .select("*")
          .order("contact_name");
        if (lands) setLandlords(lands);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await userManagementService.updateUser(userId, formData);

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      router.push(`/admin/users/${userId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const showLandlordSelection = formData.role && ["landlord_admin", "landlord_staff"].includes(formData.role);
  const showOrganizationSelection = formData.role && ["nolojia_staff", "full_isp"].includes(formData.role);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">User not found</p>
        <Link href="/admin/users">
          <Button variant="link">Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/users/${userId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit User</h1>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Update user details and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={user.email}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254712345678"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>User Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        {role.icon}
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Organization Selection */}
            {showOrganizationSelection && organizations.length > 0 && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={formData.organization_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      organization_id: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Landlord Selection */}
            {showLandlordSelection && landlords.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Landlord</Label>
                <Select
                  value={formData.landlord_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      landlord_id: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select landlord" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No landlord assigned</SelectItem>
                    {landlords.map((landlord) => (
                      <SelectItem key={landlord.id} value={landlord.id}>
                        {landlord.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Account Status</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.is_active
                    ? "User can log in and access the system"
                    : "User is blocked from accessing the system"}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link href={`/admin/users/${userId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

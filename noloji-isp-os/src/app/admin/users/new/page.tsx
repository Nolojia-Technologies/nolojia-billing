"use client";

import { useState, useEffect } from "react";
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
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { userManagementService, CreateUserInput } from "@/services/user-management-service";
import type { UserRole, Organization, Landlord } from "@/types/landlord";
import { supabase } from "@/lib/supabase";

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "nolojia_staff",
    label: "Nolojia Staff",
    description: "Internal Nolojia team member with access to admin features",
    icon: <Shield className="h-5 w-5 text-orange-600" />,
  },
  {
    value: "full_isp",
    label: "ISP Partner",
    description: "Full ISP partner with their own infrastructure",
    icon: <Globe className="h-5 w-5 text-blue-600" />,
  },
  {
    value: "landlord_admin",
    label: "Landlord Admin",
    description: "Building owner or property manager with full access",
    icon: <Building2 className="h-5 w-5 text-green-600" />,
  },
  {
    value: "landlord_staff",
    label: "Landlord Staff",
    description: "Property staff with limited access",
    icon: <User className="h-5 w-5 text-gray-600" />,
  },
];

export default function NewUserPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);

  const [formData, setFormData] = useState<CreateUserInput>({
    email: "",
    full_name: "",
    phone: "",
    role: "landlord_admin",
    organization_id: undefined,
    landlord_id: undefined,
    password: "",
  });

  // Fetch organizations and landlords for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("*")
          .order("name");
        if (orgs) setOrganizations(orgs);

        const { data: lands } = await supabase
          .from("landlords")
          .select("*")
          .order("contact_name");
        if (lands) setLandlords(lands);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name || !formData.role) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await userManagementService.createUser(formData);

      setCreatedUser({
        email: formData.email,
        password: result.temporary_password || formData.password || "N/A",
        name: formData.full_name,
      });

      toast({
        title: "Success",
        description: "User created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (createdUser?.password) {
      navigator.clipboard.writeText(createdUser.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const showLandlordSelection = ["landlord_admin", "landlord_staff"].includes(formData.role);
  const showOrganizationSelection = ["nolojia_staff", "full_isp"].includes(formData.role);

  // If user was created, show credentials screen
  if (createdUser) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              User Created Successfully
            </CardTitle>
            <CardDescription>
              Share these credentials with the new user. They can change their password after first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Name</Label>
              <p className="font-medium">{createdUser.name}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="font-medium">{createdUser.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-md border p-3 font-mono">
                  {showPassword ? createdUser.password : "••••••••••••"}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={copyPassword}>
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Important
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Make sure to share these credentials securely with the user. The temporary
                password will not be shown again. The user should change their password after
                first login.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedUser(null);
                  setFormData({
                    email: "",
                    full_name: "",
                    phone: "",
                    role: "landlord_admin",
                    organization_id: undefined,
                    landlord_id: undefined,
                    password: "",
                  });
                }}
              >
                Create Another User
              </Button>
              <Link href="/admin/users">
                <Button>Back to Users</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New User</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Add a new user to the system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Enter the details for the new user. A temporary password will be generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label>User Role *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <div
                    key={role.value}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      formData.role === role.value
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {role.icon}
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
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

            {/* Organization Selection (for staff/ISP) */}
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

            {/* Landlord Selection (for landlord roles) */}
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
                        {landlord.contact_name} - {landlord.contact_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Custom Password <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave empty to auto-generate"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, a secure temporary password will be generated automatically.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link href="/admin/users">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

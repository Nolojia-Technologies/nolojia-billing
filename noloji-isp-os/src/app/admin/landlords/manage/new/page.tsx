"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Save,
  Smartphone,
  Building,
  Key,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Generate a random password
function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function NewLandlordPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  const [formData, setFormData] = useState({
    // Company Info
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Kenya",

    // Commission
    commission_rate: "30",

    // Payout Info
    payout_method: "mpesa",
    mpesa_phone: "",
    mpesa_name: "",
    bank_name: "",
    bank_account: "",
    bank_branch: "",

    // Login Credentials
    create_login: true,
    login_email: "",
    login_password: "",
    user_role: "landlord_admin" as "landlord_admin" | "landlord_staff",

    // Initial Building (optional)
    create_building: false,
    building_name: "",
    building_address: "",
    building_units: ""
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill login email when company email changes
  const handleEmailChange = (value: string) => {
    handleChange("email", value);
    if (!formData.login_email) {
      handleChange("login_email", value);
    }
  };

  // Generate new password
  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);
    handleChange("login_password", newPassword);
  };

  // Copy credentials to clipboard
  const copyCredentials = () => {
    if (createdCredentials) {
      const text = `Login Credentials for ${formData.company_name}\n\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\n\nLogin URL: ${window.location.origin}/login`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Login credentials copied to clipboard"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Create the landlord record
      const { data: landlord, error: landlordError } = await supabase
        .from('landlords')
        .insert({
          organization_id: '00000000-0000-0000-0000-000000000001', // Nolojia org ID
          contact_name: formData.contact_name,
          contact_email: formData.email,
          contact_phone: formData.phone,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          commission_rate: parseFloat(formData.commission_rate),
          payout_method: formData.payout_method,
          payout_details: formData.payout_method === 'mpesa'
            ? { phone: formData.mpesa_phone, name: formData.mpesa_name }
            : { bank_name: formData.bank_name, account: formData.bank_account, branch: formData.bank_branch },
          is_active: true,
        })
        .select()
        .single();

      if (landlordError) throw landlordError;

      // 2. Create login account if requested (using API route like ISP)
      if (formData.create_login && formData.login_email && formData.login_password) {
        if (formData.login_password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }

        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.login_email,
            full_name: formData.contact_name,
            phone: formData.phone,
            role: formData.user_role,
            password: formData.login_password,
            landlord_id: landlord.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Landlord was created but user failed - show partial success
          toast({
            title: "Landlord Created (Partial)",
            description: `Landlord added but user account creation failed: ${data.error || 'Unknown error'}`,
            variant: "destructive"
          });
          return;
        }

        // Save credentials to show to admin
        setCreatedCredentials({
          email: formData.login_email,
          password: formData.login_password
        });

        toast({
          title: "Landlord Created Successfully!",
          description: "Login credentials have been created. Please share them with the landlord."
        });
      } else {
        toast({
          title: "Landlord Created",
          description: `${formData.company_name} has been added without login credentials.`
        });
        router.push("/admin/landlords/manage");
      }

      // 3. Create initial building if requested
      if (formData.create_building && formData.building_name && landlord) {
        await supabase
          .from('landlord_buildings')
          .insert({
            landlord_id: landlord.id,
            name: formData.building_name,
            address: formData.building_address,
            city: formData.city,
            total_units: parseInt(formData.building_units) || 0,
            status: 'active'
          });
      }

    } catch (error) {
      console.error('Error creating landlord:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create landlord",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add New Landlord
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create a new landlord account for property management
          </p>
        </div>
      </div>

      {/* Show created credentials (like ISP) */}
      {createdCredentials && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-lg text-green-800 dark:text-green-200">
              Landlord Account Created Successfully!
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Share these credentials with the landlord. They will need to change the password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <div className="space-y-2">
                <p><span className="font-medium">Company:</span> {formData.company_name}</p>
                <p><span className="font-medium">Email:</span> {createdCredentials.email}</p>
                <p><span className="font-medium">Password:</span> {createdCredentials.password}</p>
                <p><span className="font-medium">Login URL:</span> {typeof window !== 'undefined' ? window.location.origin : ''}/login</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyCredentials}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Credentials
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/landlords/manage')}>
                Back to Landlords
              </Button>
              <Button variant="outline" onClick={() => {
                setCreatedCredentials(null);
                setFormData({
                  company_name: "",
                  contact_name: "",
                  email: "",
                  phone: "",
                  address: "",
                  city: "",
                  country: "Kenya",
                  commission_rate: "30",
                  payout_method: "mpesa",
                  mpesa_phone: "",
                  mpesa_name: "",
                  bank_name: "",
                  bank_account: "",
                  bank_branch: "",
                  create_login: true,
                  login_email: "",
                  login_password: "",
                  user_role: "landlord_admin",
                  create_building: false,
                  building_name: "",
                  building_address: "",
                  building_units: ""
                });
              }}>
                Add Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form - hidden when credentials are shown */}
      {!createdCredentials && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Company Information
            </CardTitle>
            <CardDescription>
              Basic information about the landlord's company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="company_name">Company / Property Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="e.g., Sunrise Properties Ltd"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Person *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange("contact_name", e.target.value)}
                  placeholder="e.g., James Mwangi"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="contact@company.co.ke"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="e.g., Nairobi"
                  required
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Full business address"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              Commission Settings
            </CardTitle>
            <CardDescription>
              Set the commission rate for this landlord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <Label htmlFor="commission_rate">Nolojia Commission Rate *</Label>
              <Select
                value={formData.commission_rate}
                onValueChange={(value) => handleChange("commission_rate", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20% (Special)</SelectItem>
                  <SelectItem value="25">25% (Preferred)</SelectItem>
                  <SelectItem value="30">30% (Standard)</SelectItem>
                  <SelectItem value="35">35% (High Support)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                Landlord will receive {100 - parseInt(formData.commission_rate)}% of all collected payments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Login Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5 text-gray-400" />
              Login Credentials
            </CardTitle>
            <CardDescription>
              Create login credentials for the landlord to access their portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Create Login Account</Label>
                <p className="text-sm text-gray-500">
                  Allow landlord to log in and view their properties, tenants, and earnings
                </p>
              </div>
              <Switch
                checked={formData.create_login as boolean}
                onCheckedChange={(checked) => handleChange("create_login", checked)}
              />
            </div>

            {formData.create_login && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="login_email">Login Email *</Label>
                    <Input
                      id="login_email"
                      type="email"
                      value={formData.login_email}
                      onChange={(e) => handleChange("login_email", e.target.value)}
                      placeholder="landlord@example.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-filled from company email
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="user_role">Portal Access Level *</Label>
                    <Select
                      value={formData.user_role}
                      onValueChange={(value) => handleChange("user_role", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landlord_admin">
                          Admin (Full Access)
                        </SelectItem>
                        <SelectItem value="landlord_staff">
                          Staff (Limited Access)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="login_password">Password *</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        id="login_password"
                        type={showPassword ? "text" : "password"}
                        value={formData.login_password}
                        onChange={(e) => handleChange("login_password", e.target.value)}
                        placeholder="Enter password or generate"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePassword}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters
                  </p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Payout Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              Payout Information
            </CardTitle>
            <CardDescription>
              Configure how the landlord will receive their earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Payout Method *</Label>
              <Select
                value={formData.payout_method}
                onValueChange={(value) => handleChange("payout_method", value)}
              >
                <SelectTrigger className="mt-1 max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      M-Pesa
                    </div>
                  </SelectItem>
                  <SelectItem value="bank">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Bank Transfer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.payout_method === "mpesa" && (
              <div className="grid gap-4 sm:grid-cols-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label htmlFor="mpesa_phone">M-Pesa Phone Number *</Label>
                  <Input
                    id="mpesa_phone"
                    value={formData.mpesa_phone}
                    onChange={(e) => handleChange("mpesa_phone", e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mpesa_name">Registered Name *</Label>
                  <Input
                    id="mpesa_name"
                    value={formData.mpesa_name}
                    onChange={(e) => handleChange("mpesa_name", e.target.value)}
                    placeholder="Name as registered on M-Pesa"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {formData.payout_method === "bank" && (
              <div className="grid gap-4 sm:grid-cols-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleChange("bank_name", e.target.value)}
                    placeholder="e.g., Equity Bank"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_branch">Branch *</Label>
                  <Input
                    id="bank_branch"
                    value={formData.bank_branch}
                    onChange={(e) => handleChange("bank_branch", e.target.value)}
                    placeholder="e.g., Westlands Branch"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="bank_account">Account Number *</Label>
                  <Input
                    id="bank_account"
                    value={formData.bank_account}
                    onChange={(e) => handleChange("bank_account", e.target.value)}
                    placeholder="Enter account number"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Initial Building (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Initial Building (Optional)
            </CardTitle>
            <CardDescription>
              Optionally create the first building for this landlord
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create_building"
                checked={formData.create_building as boolean}
                onChange={(e) => handleChange("create_building", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="create_building">
                Create an initial building for this landlord
              </Label>
            </div>

            {formData.create_building && (
              <div className="grid gap-4 sm:grid-cols-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label htmlFor="building_name">Building Name *</Label>
                  <Input
                    id="building_name"
                    value={formData.building_name}
                    onChange={(e) => handleChange("building_name", e.target.value)}
                    placeholder="e.g., Sunrise Apartments"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="building_units">Number of Units *</Label>
                  <Input
                    id="building_units"
                    type="number"
                    min="1"
                    value={formData.building_units}
                    onChange={(e) => handleChange("building_units", e.target.value)}
                    placeholder="e.g., 24"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="building_address">Building Address *</Label>
                  <Input
                    id="building_address"
                    value={formData.building_address}
                    onChange={(e) => handleChange("building_address", e.target.value)}
                    placeholder="Full address of the building"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Landlord
              </>
            )}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}

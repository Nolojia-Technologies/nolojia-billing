"use client";

import { useState, useEffect } from "react";
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
import {
  User,
  CreditCard,
  Shield,
  Save,
  CheckCircle2,
  Smartphone,
  Building,
  Mail,
  Phone,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useLandlordProfile } from "@/hooks/use-landlord";
import { SettingsSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay } from "@/components/landlord/error-display";
import { toast } from "@/components/ui/use-toast";
import { PayoutDetails } from "@/types/landlord";

export default function SettingsPage() {
  const { landlord, loading, error, updating, refresh, updateProfile } = useLandlordProfile();

  const [profileForm, setProfileForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: ""
  });

  const [payoutForm, setPayoutForm] = useState({
    method: "mpesa",
    mpesa_phone: "",
    mpesa_name: "",
    bank_name: "",
    bank_account: "",
    bank_branch: ""
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);

  // Initialize forms when landlord data loads
  useEffect(() => {
    if (landlord) {
      setProfileForm({
        contact_name: landlord.contact_name || "",
        contact_email: landlord.contact_email || "",
        contact_phone: landlord.contact_phone || "",
        address: landlord.address || "",
        city: landlord.city || ""
      });

      const payoutDetails = landlord.payout_details as PayoutDetails || {};
      setPayoutForm({
        method: landlord.payout_method || "mpesa",
        mpesa_phone: payoutDetails.mpesa_phone || "",
        mpesa_name: payoutDetails.mpesa_name || "",
        bank_name: payoutDetails.bank_name || "",
        bank_account: payoutDetails.bank_account || "",
        bank_branch: payoutDetails.bank_branch || ""
      });
    }
  }, [landlord]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);

    const result = await updateProfile({
      contact_name: profileForm.contact_name,
      contact_email: profileForm.contact_email,
      contact_phone: profileForm.contact_phone || undefined,
      address: profileForm.address || undefined,
      city: profileForm.city || undefined
    });

    setSavingProfile(false);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully."
      });
    }
  };

  const handleSavePayout = async () => {
    setSavingPayout(true);

    const payoutDetails: PayoutDetails = payoutForm.method === 'mpesa'
      ? {
          mpesa_phone: payoutForm.mpesa_phone,
          mpesa_name: payoutForm.mpesa_name
        }
      : {
          bank_name: payoutForm.bank_name,
          bank_account: payoutForm.bank_account,
          bank_branch: payoutForm.bank_branch
        };

    const result = await updateProfile({
      payout_method: payoutForm.method as 'mpesa' | 'bank',
      payout_details: payoutDetails
    });

    setSavingPayout(false);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Payout Settings Updated",
        description: "Your payout method has been updated."
      });
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your account settings and payout preferences</p>
        </div>
        <ErrorDisplay error={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your account settings and payout preferences
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your business profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="organization_name">Company / Property Name</Label>
              <Input
                id="organization_name"
                value={landlord?.organization?.name || 'N/A'}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Contact Nolojia to change your organization name</p>
            </div>
            <div>
              <Label htmlFor="contact_name">Contact Person</Label>
              <Input
                id="contact_name"
                value={profileForm.contact_name}
                onChange={(e) => setProfileForm({ ...profileForm, contact_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Email Address</Label>
              <Input
                id="contact_email"
                type="email"
                value={profileForm.contact_email}
                onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                value={profileForm.contact_phone}
                onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile || updating}>
              {savingProfile ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            Payout Settings
          </CardTitle>
          <CardDescription>
            Configure how you receive your earnings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Payout Info */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Current Payout Method
              </span>
            </div>
            <div className="flex items-center gap-3 ml-7">
              {landlord?.payout_method === 'mpesa' ? (
                <Smartphone className="h-5 w-5 text-green-600" />
              ) : (
                <Building className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium capitalize">{landlord?.payout_method || 'Not set'}</p>
                <p className="text-sm text-gray-500">
                  {landlord?.payout_method === 'mpesa'
                    ? (landlord?.payout_details as PayoutDetails)?.mpesa_phone || 'Phone not set'
                    : (landlord?.payout_details as PayoutDetails)?.bank_name || 'Bank not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Payout Method Selection */}
          <div>
            <Label>Payout Method</Label>
            <Select
              value={payoutForm.method}
              onValueChange={(value) => setPayoutForm({ ...payoutForm, method: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select payout method" />
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

          {/* M-Pesa Fields */}
          {payoutForm.method === "mpesa" && (
            <div className="grid gap-4 sm:grid-cols-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="mpesa_phone">M-Pesa Phone Number</Label>
                <Input
                  id="mpesa_phone"
                  value={payoutForm.mpesa_phone}
                  onChange={(e) => setPayoutForm({ ...payoutForm, mpesa_phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mpesa_name">Registered Name</Label>
                <Input
                  id="mpesa_name"
                  value={payoutForm.mpesa_name}
                  onChange={(e) => setPayoutForm({ ...payoutForm, mpesa_name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Bank Fields */}
          {payoutForm.method === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={payoutForm.bank_name}
                  onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                  placeholder="e.g., Equity Bank"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bank_branch">Branch</Label>
                <Input
                  id="bank_branch"
                  value={payoutForm.bank_branch}
                  onChange={(e) => setPayoutForm({ ...payoutForm, bank_branch: e.target.value })}
                  placeholder="e.g., Westlands Branch"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bank_account">Account Number</Label>
                <Input
                  id="bank_account"
                  value={payoutForm.bank_account}
                  onChange={(e) => setPayoutForm({ ...payoutForm, bank_account: e.target.value })}
                  placeholder="Enter your account number"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSavePayout} disabled={savingPayout || updating}>
              {savingPayout ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {savingPayout ? "Saving..." : "Update Payout Method"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commission Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                Revenue Split Information
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Nolojia operates on a 70/30 revenue split model:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span><strong>{100 - ((landlord?.commission_rate || 0.3) * 100)}%</strong> - Your share (paid to your configured payout method)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span><strong>{(landlord?.commission_rate || 0.3) * 100}%</strong> - Nolojia commission (covers infrastructure, support, billing)</span>
                </li>
              </ul>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-3">
                Payouts are processed monthly by the 5th of each month for the previous month's earnings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Email Support</p>
                <p className="font-medium">support@nolojia.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Phone Support</p>
                <p className="font-medium">+254 700 000 000</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

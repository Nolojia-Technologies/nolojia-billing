"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Globe,
    User,
    Mail,
    Phone,
    Key,
    Eye,
    EyeOff,
    RefreshCw,
    Save,
    Copy,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { userManagementService } from "@/services/user-management-service";

// Generate a random password
function generatePassword(length: number = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export default function NewISPPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword(12);
        handleChange("password", newPassword);
    };

    const copyCredentials = () => {
        if (createdCredentials) {
            const text = `ISP Login Credentials\n\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\n\nLogin URL: ${window.location.origin}/login`;
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
            // Validate form
            if (!formData.email || !formData.full_name || !formData.password) {
                throw new Error("Please fill in all required fields");
            }

            if (formData.password.length < 8) {
                throw new Error("Password must be at least 8 characters");
            }

            // Create the ISP user via API (bypasses RLS)
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    full_name: formData.full_name,
                    phone: formData.phone,
                    role: 'full_isp',
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create ISP account');
            }

            // Save credentials to show to admin
            setCreatedCredentials({
                email: formData.email,
                password: formData.password
            });

            toast({
                title: "ISP Account Created!",
                description: "Login credentials have been created. Please share them with the ISP."
            });

        } catch (error) {
            console.error('Error creating ISP:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create ISP account",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Add New ISP
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Create a new Internet Service Provider account
                    </p>
                </div>
            </div>

            {/* Show created credentials */}
            {createdCredentials && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                    <CardHeader>
                        <CardTitle className="text-lg text-green-800 dark:text-green-200">
                            ISP Account Created Successfully!
                        </CardTitle>
                        <CardDescription className="text-green-700 dark:text-green-300">
                            Share these credentials with the ISP. They will need to change the password on first login.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="space-y-2">
                                <p><span className="font-medium">Email:</span> {createdCredentials.email}</p>
                                <p><span className="font-medium">Password:</span> {createdCredentials.password}</p>
                                <p><span className="font-medium">Login URL:</span> {window.location.origin}/login</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={copyCredentials}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Credentials
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/admin/isps')}>
                                Back to ISPs
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setCreatedCredentials(null);
                                setFormData({
                                    full_name: "",
                                    email: "",
                                    phone: "",
                                    password: "",
                                });
                            }}>
                                Add Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Form */}
            {!createdCredentials && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ISP Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Globe className="h-5 w-5 text-gray-400" />
                                ISP Information
                            </CardTitle>
                            <CardDescription>
                                Basic information about the ISP account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="full_name">ISP / Company Name *</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange("full_name", e.target.value)}
                                    placeholder="e.g., FastNet ISP Ltd"
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
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    placeholder="admin@isp-company.co.ke"
                                    required
                                    className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will be used for login
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    placeholder="+254 7XX XXX XXX"
                                    className="mt-1"
                                />
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
                                Set the initial password for this ISP account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="password">Password *</Label>
                                <div className="flex gap-2 mt-1">
                                    <div className="relative flex-1">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleChange("password", e.target.value)}
                                            placeholder="Enter password or generate"
                                            required
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
                                    Password must be at least 8 characters. The ISP should change this after first login.
                                </p>
                            </div>
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
                                    Create ISP Account
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

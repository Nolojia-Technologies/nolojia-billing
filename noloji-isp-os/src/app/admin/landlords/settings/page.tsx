"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Percent,
    Banknote,
    Building2,
    Save,
    RefreshCw,
    Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const NOLOJIA_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface LandlordSettings {
    commission: {
        default_rate: string;
        min_rate: string;
        max_rate: string;
        method: string;
    };
    payout: {
        schedule: string;
        min_threshold: string;
        auto_enabled: boolean;
        methods: {
            mpesa: boolean;
            bank: boolean;
            cheque: boolean;
        };
    };
    onboarding: {
        auto_verify: boolean;
        default_building_limit: string;
        require_docs: boolean;
    };
}

const DEFAULT_SETTINGS: LandlordSettings = {
    commission: {
        default_rate: "30",
        min_rate: "20",
        max_rate: "50",
        method: "per_transaction"
    },
    payout: {
        schedule: "monthly",
        min_threshold: "5000",
        auto_enabled: true,
        methods: { mpesa: true, bank: true, cheque: false }
    },
    onboarding: {
        auto_verify: false,
        default_building_limit: "10",
        require_docs: true
    }
};

export default function AdminLandlordsSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State mirroring the structure
    const [settings, setSettings] = useState<LandlordSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', NOLOJIA_ORG_ID)
                .single();

            if (error) throw error;

            if (data?.settings && (data.settings as any).landlord_config) {
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...(data.settings as any).landlord_config
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            // Don't show error to user, just use defaults
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // we need to merge with existing settings in DB so we don't wipe other stuff
            const { data: currentData } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', NOLOJIA_ORG_ID)
                .single();

            const currentSettings = (currentData?.settings as object) || {};

            const newSettings = {
                ...currentSettings,
                landlord_config: settings
            };

            const { error } = await supabase
                .from('organizations')
                .update({ settings: newSettings })
                .eq('id', NOLOJIA_ORG_ID);

            if (error) throw error;

            toast({
                title: "Settings Saved",
                description: "Landlord configuration has been updated successfully."
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Error",
                description: "Failed to save settings: " + error.message,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper handlers
    const updateCommission = (key: keyof LandlordSettings['commission'], value: string) => {
        setSettings(prev => ({
            ...prev,
            commission: { ...prev.commission, [key]: value }
        }));
    };

    const updatePayout = (key: keyof LandlordSettings['payout'], value: any) => {
        setSettings(prev => ({
            ...prev,
            payout: { ...prev.payout, [key]: value }
        }));
    };

    const togglePayoutMethod = (method: keyof LandlordSettings['payout']['methods']) => {
        setSettings(prev => ({
            ...prev,
            payout: {
                ...prev.payout,
                methods: {
                    ...prev.payout.methods,
                    [method]: !prev.payout.methods[method]
                }
            }
        }));
    };

    const updateOnboarding = (key: keyof LandlordSettings['onboarding'], value: any) => {
        setSettings(prev => ({
            ...prev,
            onboarding: { ...prev.onboarding, [key]: value }
        }));
    };

    if (loading) {
        return <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Landlord Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Configure global defaults for landlord management
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Defaults
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Commission Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5 text-orange-500" />
                            Commission Settings
                        </CardTitle>
                        <CardDescription>Set default revenue share percentages</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Default Commission Rate (%)</Label>
                            <Input
                                type="number"
                                value={settings.commission.default_rate}
                                onChange={(e) => updateCommission('default_rate', e.target.value)}
                            />
                            <p className="text-xs text-gray-500">Applied to new landlords automatically</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min Rate (%)</Label>
                                <Input
                                    type="number"
                                    value={settings.commission.min_rate}
                                    onChange={(e) => updateCommission('min_rate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Rate (%)</Label>
                                <Input
                                    type="number"
                                    value={settings.commission.max_rate}
                                    onChange={(e) => updateCommission('max_rate', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payout Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-blue-500" />
                            Payout Configuration
                        </CardTitle>
                        <CardDescription>Manage how landlords get paid</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="auto-payout">Enable Auto-Payouts</Label>
                            <Switch
                                id="auto-payout"
                                checked={settings.payout.auto_enabled}
                                onCheckedChange={(c) => updatePayout('auto_enabled', c)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Minimum Payout Threshold (KES)</Label>
                            <Input
                                type="number"
                                value={settings.payout.min_threshold}
                                onChange={(e) => updatePayout('min_threshold', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Allowed Payment Methods</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Switch checked={settings.payout.methods.mpesa} onCheckedChange={() => togglePayoutMethod('mpesa')} />
                                    <span>M-Pesa</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={settings.payout.methods.bank} onCheckedChange={() => togglePayoutMethod('bank')} />
                                    <span>Bank Transfer</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Onboarding Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-purple-500" />
                            Onboarding Defaults
                        </CardTitle>
                        <CardDescription>New landlord account settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto-Verify Landlords</Label>
                                <p className="text-xs text-gray-500">Skip manual verification step</p>
                            </div>
                            <Switch
                                checked={settings.onboarding.auto_verify}
                                onCheckedChange={(c) => updateOnboarding('auto_verify', c)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Default Building Limit</Label>
                            <Input
                                type="number"
                                value={settings.onboarding.default_building_limit}
                                onChange={(e) => updateOnboarding('default_building_limit', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

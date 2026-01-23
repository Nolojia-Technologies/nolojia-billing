"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useCustomerMutations,
  useLandlordProfile,
  useLandlordBuildings,
  useBuildingUnits,
  useLandlordPackages
} from "@/hooks/use-landlord";
import { User, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { LandlordCustomer } from "@/types/landlord";

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editCustomer?: LandlordCustomer;
}

export function TenantDialog({ open, onOpenChange, onSuccess, editCustomer }: TenantDialogProps) {
  const { landlord } = useLandlordProfile();
  const { buildings } = useLandlordBuildings();
  const { packages } = useLandlordPackages();
  const { createCustomer, updateCustomer, loading } = useCustomerMutations();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const { units } = useBuildingUnits(selectedBuildingId || null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    national_id: "",
    building_id: "",
    unit_id: "",
    package_id: ""
  });

  // Reset form when dialog opens/closes or editCustomer changes
  useEffect(() => {
    if (open) {
      if (editCustomer) {
        const buildingId = (editCustomer.unit as any)?.building?.id || "";
        setFormData({
          name: editCustomer.name || "",
          phone: editCustomer.phone || "",
          email: editCustomer.email || "",
          national_id: editCustomer.national_id || "",
          building_id: buildingId,
          unit_id: editCustomer.unit_id || "",
          package_id: (editCustomer.subscription as any)?.[0]?.package_id || ""
        });
        setSelectedBuildingId(buildingId);
      } else {
        setFormData({
          name: "",
          phone: "",
          email: "",
          national_id: "",
          building_id: "",
          unit_id: "",
          package_id: ""
        });
        setSelectedBuildingId("");
      }
    }
  }, [open, editCustomer]);

  const handleBuildingChange = (buildingId: string) => {
    setFormData({ ...formData, building_id: buildingId, unit_id: "" });
    setSelectedBuildingId(buildingId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!landlord?.id) {
      toast({
        title: "Error",
        description: "Unable to determine landlord. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Tenant name is required",
        variant: "destructive"
      });
      return;
    }

    if (editCustomer) {
      // Update existing customer
      const result = await updateCustomer(editCustomer.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        national_id: formData.national_id.trim() || undefined,
        unit_id: formData.unit_id || undefined
      });

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Tenant Updated",
          description: `${formData.name} has been updated successfully.`
        });
        onSuccess?.();
      }
    } else {
      // Create new customer
      const result = await createCustomer({
        landlord_id: landlord.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        national_id: formData.national_id.trim() || undefined,
        unit_id: formData.unit_id || undefined,
        package_id: formData.package_id || ""
      });

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Tenant Created",
          description: `${formData.name} has been added successfully.`
        });
        onSuccess?.();
      }
    }
  };

  // Filter to show only vacant units
  const availableUnits = units.filter(u =>
    u.status === 'vacant' || u.id === formData.unit_id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {editCustomer ? "Edit Tenant" : "Add New Tenant"}
          </DialogTitle>
          <DialogDescription>
            {editCustomer
              ? "Update tenant information"
              : "Add a new tenant to your property. They will be assigned a subscription."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="national_id">National ID (optional)</Label>
            <Input
              id="national_id"
              value={formData.national_id}
              onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
              placeholder="e.g., 12345678"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Building</Label>
              <Select value={formData.building_id} onValueChange={handleBuildingChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                disabled={!formData.building_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.building_id ? "Select unit" : "Select building first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number} {unit.status !== 'vacant' && '(occupied)'}
                    </SelectItem>
                  ))}
                  {availableUnits.length === 0 && (
                    <SelectItem value="" disabled>No vacant units</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!editCustomer && (
            <div className="space-y-2">
              <Label>Internet Package</Label>
              <Select
                value={formData.package_id}
                onValueChange={(value) => setFormData({ ...formData, package_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - KES {pkg.price.toLocaleString()}/month ({pkg.speed_mbps}Mbps)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                A subscription will be created for this package
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Saving..." : (editCustomer ? "Update Tenant" : "Add Tenant")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useBuildingMutations, useLandlordProfile } from "@/hooks/use-landlord";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AddBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddBuildingDialog({ open, onOpenChange, onSuccess }: AddBuildingDialogProps) {
  const { landlord } = useLandlordProfile();
  const { createBuilding, loading } = useBuildingMutations();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    total_units: "",
    generate_units: true,
    unit_prefix: ""
  });

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
        description: "Building name is required",
        variant: "destructive"
      });
      return;
    }

    const totalUnits = parseInt(formData.total_units) || 0;
    if (totalUnits <= 0) {
      toast({
        title: "Validation Error",
        description: "Total units must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const result = await createBuilding({
      landlord_id: landlord.id,
      name: formData.name.trim(),
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      total_units: totalUnits,
      generate_units: formData.generate_units,
      unit_prefix: formData.unit_prefix.trim() || undefined
    });

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Building Created",
        description: `${formData.name} has been added successfully${formData.generate_units ? ` with ${totalUnits} units` : ''}.`
      });
      setFormData({
        name: "",
        address: "",
        city: "",
        total_units: "",
        generate_units: true,
        unit_prefix: ""
      });
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Building
          </DialogTitle>
          <DialogDescription>
            Add a new property to your portfolio. Units can be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Building Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sunset Apartments"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Nairobi"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_units">Total Units *</Label>
            <Input
              id="total_units"
              type="number"
              min="1"
              max="1000"
              value={formData.total_units}
              onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
              placeholder="e.g., 20"
              required
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <Label htmlFor="generate_units" className="font-medium">
                Auto-generate Units
              </Label>
              <p className="text-sm text-gray-500">
                Automatically create unit entries (e.g., 001, 002, 003...)
              </p>
            </div>
            <Switch
              id="generate_units"
              checked={formData.generate_units}
              onCheckedChange={(checked) => setFormData({ ...formData, generate_units: checked })}
            />
          </div>

          {formData.generate_units && (
            <div className="space-y-2">
              <Label htmlFor="unit_prefix">Unit Prefix (optional)</Label>
              <Input
                id="unit_prefix"
                value={formData.unit_prefix}
                onChange={(e) => setFormData({ ...formData, unit_prefix: e.target.value })}
                placeholder="e.g., A, B, Floor1-"
              />
              <p className="text-xs text-gray-500">
                Units will be named: {formData.unit_prefix || ''}001, {formData.unit_prefix || ''}002, etc.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Creating..." : "Create Building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

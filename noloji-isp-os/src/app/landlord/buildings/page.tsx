"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  Wifi,
  WifiOff,
  Search,
  ChevronRight,
  Home,
  MapPin,
  Plus,
  RefreshCw
} from "lucide-react";
import { useLandlordBuildings, useBuildingUnits } from "@/hooks/use-landlord";
import { BuildingsSkeleton } from "@/components/landlord/loading-states";
import { ErrorDisplay, EmptyState } from "@/components/landlord/error-display";
import { AddBuildingDialog } from "@/components/landlord/add-building-dialog";
import { LandlordBuilding, Unit } from "@/types/landlord";

export default function BuildingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const {
    buildings,
    loading: buildingsLoading,
    error: buildingsError,
    refresh: refreshBuildings
  } = useLandlordBuildings();

  const {
    units,
    loading: unitsLoading,
    error: unitsError,
    refresh: refreshUnits
  } = useBuildingUnits(selectedBuildingId);

  const filteredBuildings = buildings.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "text-green-600 bg-green-100";
    if (rate >= 70) return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  const getConnectionBadge = (status: string | undefined) => {
    if (status === "active") {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
    } else if (status === "suspended") {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
    }
    return <Badge variant="secondary">No Connection</Badge>;
  };

  if (buildingsLoading) {
    return <BuildingsSkeleton />;
  }

  if (buildingsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buildings</h1>
          <p className="text-gray-500 dark:text-gray-400">View your properties and tenant status</p>
        </div>
        <ErrorDisplay error={buildingsError} onRetry={refreshBuildings} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Buildings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View your properties and tenant status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshBuildings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Building
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search buildings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Buildings Grid / Detail View */}
      {selectedBuilding ? (
        /* Building Detail View */
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedBuildingId(null)}
            className="mb-2"
          >
            &larr; Back to Buildings
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    {selectedBuilding.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {selectedBuilding.address || 'No address'}{selectedBuilding.city ? `, ${selectedBuilding.city}` : ''}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {selectedBuilding.total_units} Units
                  </Badge>
                  <Badge className={getOccupancyColor(
                    selectedBuilding.total_units > 0
                      ? ((selectedBuilding.occupied_units || 0) / selectedBuilding.total_units) * 100
                      : 0
                  )}>
                    {selectedBuilding.total_units > 0
                      ? Math.round(((selectedBuilding.occupied_units || 0) / selectedBuilding.total_units) * 100)
                      : 0}% Occupied
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <Home className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{selectedBuilding.total_units}</p>
                  <p className="text-sm text-gray-500">Total Units</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                  <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-600">{selectedBuilding.occupied_units || 0}</p>
                  <p className="text-sm text-gray-500">Occupied</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                  <Wifi className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">{selectedBuilding.active_customers || 0}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>

              {/* Units List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Units</h3>
                  <Button variant="ghost" size="sm" onClick={refreshUnits}>
                    <RefreshCw className={`h-4 w-4 ${unitsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {unitsError && (
                  <ErrorDisplay error={unitsError} onRetry={refreshUnits} />
                )}

                {unitsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {units.length > 0 ? (
                      units.map((unit) => {
                        const customer = unit.customer as any;
                        const subscription = customer?.subscription?.[0];

                        return (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center border">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {unit.unit_number}
                                </span>
                              </div>
                              <div>
                                {customer ? (
                                  <>
                                    <p className="font-medium">{customer.name}</p>
                                    <p className="text-sm text-gray-500">
                                      {subscription?.package?.name || 'No package'}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-gray-400 italic">Vacant</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {customer && (
                                <>
                                  {getConnectionBadge(customer.status)}
                                  {customer.status === "active" && (
                                    <Wifi className="h-4 w-4 text-green-500" />
                                  )}
                                  {customer.status === "suspended" && (
                                    <WifiOff className="h-4 w-4 text-red-500" />
                                  )}
                                </>
                              )}
                              {!customer && (
                                <Badge variant="secondary">Vacant</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        No units found for this building
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Buildings List */
        <>
          {filteredBuildings.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12 text-gray-400" />}
              title={buildings.length === 0 ? "No buildings yet" : "No buildings found"}
              description={buildings.length === 0
                ? "Add your first building to get started"
                : "Try adjusting your search criteria"}
              action={buildings.length === 0 && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              )}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBuildings.map((building) => {
                const occupancyRate = building.total_units > 0
                  ? ((building.occupied_units || 0) / building.total_units) * 100
                  : 0;

                return (
                  <Card
                    key={building.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedBuildingId(building.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <Badge className={getOccupancyColor(occupancyRate)}>
                          {Math.round(occupancyRate)}% Occupied
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-lg mb-1">{building.name}</h3>
                      <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {building.address || 'No address set'}
                      </p>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-lg font-bold">{building.total_units}</p>
                          <p className="text-xs text-gray-500">Units</p>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                          <p className="text-lg font-bold text-blue-600">{building.occupied_units || 0}</p>
                          <p className="text-xs text-gray-500">Occupied</p>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded">
                          <p className="text-lg font-bold text-green-600">{building.active_customers || 0}</p>
                          <p className="text-xs text-gray-500">Active</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">{building.active_customers || 0} online</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>View Details</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Building Dialog */}
      <AddBuildingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          setAddDialogOpen(false);
          refreshBuildings();
        }}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

const SYNC_INTERVAL = 30000; // 30 seconds

// Dynamically import heavy map component - Leaflet/MapLibre are ~500KB+
const NetworkMap = dynamic(
  () => import("@/components/maps/NetworkMap").then((mod) => mod.NetworkMap),
  {
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted/50">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false, // Map libraries don't work with SSR
  }
);
import {
  Map,
  Layers,
  MapPin,
  RefreshCw,
  Cable,
  Router,
  Home,
  Eye,
  EyeOff,
  Users,
  Pencil,
  Trash2,
  X,
  Plus,
  MousePointer,
  Network,
  Search,
  Radio
} from "lucide-react";

interface Customer {
  id: number;
  username: string;
  full_name?: string;
  latitude?: number;
  longitude?: number;
  is_online?: boolean;
  is_active?: boolean;
  address?: string;
  phone?: string;
  connection_type?: string;
  plans?: any;
}

interface FiberCable {
  id: number;
  name: string;
  description?: string;
  coordinates: [number, number][];
  cable_type: string;
  length_meters?: number;
  fiber_count?: number;
  core_signals?: { core: number; signal: string }[];
  status: string;
  color: string;
}

interface GISLabel {
  id: number;
  name: string;
  description?: string;
  label_type: string;
  latitude: number;
  longitude: number;
  icon: string;
  color: string;
}

interface NetworkPoint {
  id: number;
  name: string;
  description?: string;
  point_type: string;
  latitude: number;
  longitude: number;
  capacity: number;
  used_ports: number;
  available_signals: string[];
  customer_ids: number[];
  status: string;
  color: string;
}

interface NewCableData {
  name: string;
  cable_type: string;
  status: string;
  fiber_count: number;
  core_signals: { core: number; signal: string }[];
  color: string;
  description: string;
}

interface NewNetworkPointData {
  name: string;
  point_type: string;
  capacity: number;
  available_signals: string[];
  status: string;
  color: string;
  description: string;
}

export default function GISPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fiberCables, setFiberCables] = useState<FiberCable[]>([]);
  const [labels, setLabels] = useState<GISLabel[]>([]);
  const [networkPoints, setNetworkPoints] = useState<NetworkPoint[]>([]);
  const [unlabeledCustomers, setUnlabeledCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.2921, 36.8219]);

  // Drawing mode - updated to include network_point and customer_pin
  const [drawingMode, setDrawingMode] = useState<'none' | 'line' | 'marker' | 'delete' | 'network_point' | 'customer_pin'>('none');
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [lastSnappedCable, setLastSnappedCable] = useState<string | null>(null);

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCable, setSelectedCable] = useState<FiberCable | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<GISLabel | null>(null);
  const [selectedNetworkPoint, setSelectedNetworkPoint] = useState<NetworkPoint | null>(null);
  const [showAddLabelModal, setShowAddLabelModal] = useState(false);
  const [newLabelData, setNewLabelData] = useState({ name: '', label_type: 'poi', lat: 0, lng: 0 });

  // Cable modal state
  const [showAddCableModal, setShowAddCableModal] = useState(false);
  const [newCableData, setNewCableData] = useState<NewCableData>({
    name: '',
    cable_type: 'fiber',
    status: 'active',
    fiber_count: 12,
    core_signals: [],
    color: '#3b82f6',
    description: ''
  });

  // Network Point modal state
  const [showNetworkPointModal, setShowNetworkPointModal] = useState(false);
  const [networkPointLocation, setNetworkPointLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [newNetworkPointData, setNewNetworkPointData] = useState<NewNetworkPointData>({
    name: '',
    point_type: 'fat',
    capacity: 8,
    available_signals: [],
    status: 'active',
    color: '#f97316',
    description: ''
  });
  const [newSignalInput, setNewSignalInput] = useState('');

  // Customer labeling modal state
  const [showCustomerPinModal, setShowCustomerPinModal] = useState(false);
  const [customerPinLocation, setCustomerPinLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerForPin, setSelectedCustomerForPin] = useState<Customer | null>(null);

  // Layers
  const [layers, setLayers] = useState({
    customers: true,
    cables: true,
    labels: true,
    networkPoints: true
  });

  // Real-time sync state
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [, setTick] = useState(0); // Force re-render for time display
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Update time display every 5 seconds
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(tickInterval);
  }, []);

  // Track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load customers with coordinates
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, username, full_name, latitude, longitude, is_online, is_active, address, phone, connection_type, plans:plan_id(name)')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (isMounted.current) setCustomers(customersData || []);

      // Load fiber cables
      const { data: cablesData } = await supabase
        .from('fiber_cables')
        .select('*');
      if (isMounted.current) setFiberCables(cablesData || []);

      // Load labels
      const { data: labelsData } = await supabase
        .from('gis_labels')
        .select('*');
      if (isMounted.current) setLabels(labelsData || []);

      // Load network points
      const { data: networkPointsData } = await supabase
        .from('network_points')
        .select('*');
      if (isMounted.current) setNetworkPoints(networkPointsData || []);

      // Load unlabeled customers (no coordinates)
      const { data: unlabeledData } = await supabase
        .from('customers')
        .select('id, username, full_name, address, phone')
        .or('latitude.is.null,longitude.is.null');
      if (isMounted.current) setUnlabeledCustomers(unlabeledData || []);

    } catch (error: any) {
      console.error('Failed to load GIS data:', error.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // Sync online status with MikroTik and reload customers
  const syncOnlineStatus = async (silent: boolean = false) => {
    if (!isMounted.current) return;

    if (!silent) setSyncing(true);

    try {
      // Step 1: Call MikroTik service to sync online status to database
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      await fetch(`${mikrotikServiceUrl}/api/customers/sync-online-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {
        // Silently ignore MikroTik errors - we'll still reload from DB
      });

      // Step 2: Reload customers from database to get updated online status
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, username, full_name, latitude, longitude, is_online, is_active, address, phone, connection_type, plans:plan_id(name)')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (isMounted.current) {
        setCustomers(customersData || []);
        setLastSyncTime(new Date());
      }
    } catch (error: any) {
      console.error('Sync failed:', error.message);
    } finally {
      if (isMounted.current && !silent) setSyncing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync interval for online status
  useEffect(() => {
    if (autoSync) {
      // Initial sync after a short delay to let loadData complete first
      const initialTimeout = setTimeout(() => {
        syncOnlineStatus(true);
      }, 1000);

      // Set up interval
      syncIntervalRef.current = setInterval(() => {
        syncOnlineStatus(true);
      }, SYNC_INTERVAL);

      return () => {
        clearTimeout(initialTimeout);
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval when autoSync is disabled
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }
  }, [autoSync]);

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    return `${diffMinutes}m ago`;
  };

  const stats = {
    customers: customers.length,
    online: customers.filter(c => c.is_online).length,
    cables: fiberCables.length,
    labels: labels.length,
    networkPoints: networkPoints.length,
    unlabeled: unlabeledCustomers.length,
    totalCableLength: fiberCables.reduce((total, cable) => total + (cable.length_meters || 0), 0)
  };

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Handle map click for different modes
  const handleMapClick = (lat: number, lng: number) => {
    if (drawingMode === 'marker') {
      setNewLabelData({ ...newLabelData, lat, lng });
      setShowAddLabelModal(true);
      setDrawingMode('none');
    } else if (drawingMode === 'network_point') {
      setNetworkPointLocation({ lat, lng });
      setShowNetworkPointModal(true);
      setDrawingMode('none');
    } else if (drawingMode === 'customer_pin') {
      setCustomerPinLocation({ lat, lng });
      setShowCustomerPinModal(true);
      setDrawingMode('none');
    }
  };

  // Save new label
  const saveLabel = async () => {
    try {
      const { error } = await supabase
        .from('gis_labels')
        .insert({
          name: newLabelData.name,
          label_type: newLabelData.label_type,
          latitude: newLabelData.lat,
          longitude: newLabelData.lng,
          color: '#8b5cf6'
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Label added to map' });
      setShowAddLabelModal(false);
      setNewLabelData({ name: '', label_type: 'poi', lat: 0, lng: 0 });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Delete label
  const deleteLabel = async (id: number) => {
    try {
      await supabase.from('gis_labels').delete().eq('id', id);
      toast({ title: 'Deleted', description: 'Label removed' });
      setSelectedLabel(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Save network point
  const saveNetworkPoint = async () => {
    try {
      const { error } = await supabase
        .from('network_points')
        .insert({
          name: newNetworkPointData.name,
          description: newNetworkPointData.description || null,
          point_type: newNetworkPointData.point_type,
          latitude: networkPointLocation.lat,
          longitude: networkPointLocation.lng,
          capacity: newNetworkPointData.capacity,
          used_ports: 0,
          available_signals: newNetworkPointData.available_signals,
          customer_ids: [],
          status: newNetworkPointData.status,
          color: newNetworkPointData.color
        });

      if (error) throw error;

      toast({ title: 'Success', description: `Network point "${newNetworkPointData.name}" added to map` });
      setShowNetworkPointModal(false);
      setNewNetworkPointData({
        name: '',
        point_type: 'fat',
        capacity: 8,
        available_signals: [],
        status: 'active',
        color: '#f97316',
        description: ''
      });
      setNewSignalInput('');
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Add signal to network point form
  const addSignalToNetworkPoint = () => {
    if (newSignalInput.trim()) {
      setNewNetworkPointData(prev => ({
        ...prev,
        available_signals: [...prev.available_signals, newSignalInput.trim()]
      }));
      setNewSignalInput('');
    }
  };

  // Remove signal from network point form
  const removeSignalFromNetworkPoint = (index: number) => {
    setNewNetworkPointData(prev => ({
      ...prev,
      available_signals: prev.available_signals.filter((_, i) => i !== index)
    }));
  };

  // Delete network point
  const deleteNetworkPoint = async (id: number) => {
    try {
      await supabase.from('network_points').delete().eq('id', id);
      toast({ title: 'Deleted', description: 'Network point removed' });
      setSelectedNetworkPoint(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Label customer location (assign lat/lng to a customer)
  const labelCustomerLocation = async () => {
    if (!selectedCustomerForPin) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          latitude: customerPinLocation.lat,
          longitude: customerPinLocation.lng
        })
        .eq('id', selectedCustomerForPin.id);

      if (error) throw error;

      toast({ title: 'Success', description: `Location assigned to ${selectedCustomerForPin.full_name || selectedCustomerForPin.username}` });
      setShowCustomerPinModal(false);
      setSelectedCustomerForPin(null);
      setCustomerSearchQuery('');
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Filter unlabeled customers by search query
  const filteredUnlabeledCustomers = unlabeledCustomers.filter(c =>
    c.username.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.full_name && c.full_name.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()))
  );

  // Delete cable
  const deleteCable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entire cable?')) return;
    try {
      await supabase.from('fiber_cables').delete().eq('id', id);
      toast({ title: 'Deleted', description: 'Cable removed' });
      setSelectedCable(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Trim cable from start (remove first N points)
  const trimCableFromStart = async (cable: FiberCable, pointsToRemove: number) => {
    if (cable.coordinates.length <= pointsToRemove + 1) {
      toast({ title: 'Error', description: 'Cannot trim - would leave less than 2 points', variant: 'destructive' });
      return;
    }

    const newCoordinates = cable.coordinates.slice(pointsToRemove);
    const newLength = calculateCableLength(newCoordinates);

    try {
      await supabase
        .from('fiber_cables')
        .update({
          coordinates: newCoordinates,
          length_meters: Math.round(newLength)
        })
        .eq('id', cable.id);

      toast({ title: 'Trimmed', description: `Removed ${pointsToRemove} point(s) from start` });
      setSelectedCable(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Trim cable from end (remove last N points)
  const trimCableFromEnd = async (cable: FiberCable, pointsToRemove: number) => {
    if (cable.coordinates.length <= pointsToRemove + 1) {
      toast({ title: 'Error', description: 'Cannot trim - would leave less than 2 points', variant: 'destructive' });
      return;
    }

    const newCoordinates = cable.coordinates.slice(0, -pointsToRemove);
    const newLength = calculateCableLength(newCoordinates);

    try {
      await supabase
        .from('fiber_cables')
        .update({
          coordinates: newCoordinates,
          length_meters: Math.round(newLength)
        })
        .eq('id', cable.id);

      toast({ title: 'Trimmed', description: `Removed ${pointsToRemove} point(s) from end` });
      setSelectedCable(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Split cable at a specific point index (creates two cables)
  const splitCableAtPoint = async (cable: FiberCable, splitIndex: number) => {
    if (splitIndex < 1 || splitIndex >= cable.coordinates.length - 1) {
      toast({ title: 'Error', description: 'Invalid split point', variant: 'destructive' });
      return;
    }

    const firstHalf = cable.coordinates.slice(0, splitIndex + 1);
    const secondHalf = cable.coordinates.slice(splitIndex);

    try {
      // Update original cable with first half
      await supabase
        .from('fiber_cables')
        .update({
          coordinates: firstHalf,
          length_meters: Math.round(calculateCableLength(firstHalf)),
          name: `${cable.name} (Part 1)`
        })
        .eq('id', cable.id);

      // Create new cable with second half
      await supabase
        .from('fiber_cables')
        .insert({
          name: `${cable.name} (Part 2)`,
          description: cable.description,
          coordinates: secondHalf,
          cable_type: cable.cable_type,
          length_meters: Math.round(calculateCableLength(secondHalf)),
          fiber_count: cable.fiber_count,
          status: cable.status,
          color: cable.color
        });

      toast({ title: 'Split Complete', description: 'Cable split into two parts' });
      setSelectedCable(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Handle line drawing clicks
  const handleLineClick = (lat: number, lng: number) => {
    setDrawingPoints(prev => [...prev, [lat, lng]]);
  };

  // Calculate cable length using Haversine formula
  const calculateCableLength = (points: [number, number][]): number => {
    if (points.length < 2) return 0;

    const toRad = (deg: number) => deg * (Math.PI / 180);
    let totalDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const [lat1, lng1] = points[i];
      const [lat2, lng2] = points[i + 1];

      const R = 6371000; // Earth's radius in meters
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }

    return Math.round(totalDistance * 100) / 100;
  };

  // Finish drawing cable and show modal
  const finishDrawing = () => {
    if (drawingPoints.length < 2) {
      toast({ title: 'Error', description: 'Please add at least 2 points to create a cable', variant: 'destructive' });
      return;
    }
    // Initialize core signals based on fiber count
    const initialCoreSignals = Array.from({ length: newCableData.fiber_count }, (_, i) => ({
      core: i + 1,
      signal: ''
    }));
    setNewCableData(prev => ({ ...prev, core_signals: initialCoreSignals }));
    setShowAddCableModal(true);
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setDrawingMode('none');
    setDrawingPoints([]);
    setLastSnappedCable(null);
  };

  // Update core signals when fiber count changes
  const handleFiberCountChange = (count: number) => {
    const newCoreSignals = Array.from({ length: count }, (_, i) => ({
      core: i + 1,
      signal: newCableData.core_signals[i]?.signal || ''
    }));
    setNewCableData(prev => ({ ...prev, fiber_count: count, core_signals: newCoreSignals }));
  };

  // Update individual core signal
  const updateCoreSignal = (coreIndex: number, signal: string) => {
    setNewCableData(prev => ({
      ...prev,
      core_signals: prev.core_signals.map((cs, i) =>
        i === coreIndex ? { ...cs, signal } : cs
      )
    }));
  };

  // Save new cable
  const saveCable = async () => {
    try {
      const length = calculateCableLength(drawingPoints);

      console.log('Saving cable with data:', {
        name: newCableData.name,
        description: newCableData.description || null,
        coordinates: drawingPoints,
        cable_type: newCableData.cable_type,
        length_meters: length,
        fiber_count: newCableData.fiber_count,
        core_signals: newCableData.core_signals.filter(cs => cs.signal.trim() !== ''),
        status: newCableData.status,
        color: newCableData.color
      });

      const { data, error } = await supabase
        .from('fiber_cables')
        .insert({
          name: newCableData.name,
          description: newCableData.description || null,
          coordinates: drawingPoints,
          cable_type: newCableData.cable_type,
          length_meters: length,
          fiber_count: newCableData.fiber_count,
          // core_signals column needs to be added via migration - see add-core-signals-column.sql
          status: newCableData.status,
          color: newCableData.color
        })
        .select();

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      toast({ title: 'Success', description: `Cable "${newCableData.name}" added to map (${length}m)` });
      setShowAddCableModal(false);
      setDrawingMode('none');
      setDrawingPoints([]);
      setLastSnappedCable(null);
      setNewCableData({
        name: '',
        cable_type: 'fiber',
        status: 'active',
        fiber_count: 12,
        core_signals: [],
        color: '#3b82f6',
        description: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error saving cable:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save cable', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GIS Map</h1>
          <p className="text-muted-foreground">
            Network infrastructure and customer locations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Drawing Tools */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Pencil className="h-4 w-4" />
                <span>Drawing Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={drawingMode === 'none' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => { setDrawingMode('none'); setDrawingPoints([]); }}
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Select
              </Button>
              <Button
                variant={drawingMode === 'customer_pin' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setDrawingMode('customer_pin')}
              >
                <Home className="h-4 w-4 mr-2" />
                Label Customer
                {stats.unlabeled > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{stats.unlabeled}</Badge>
                )}
              </Button>
              <Button
                variant={drawingMode === 'network_point' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setDrawingMode('network_point')}
              >
                <Network className="h-4 w-4 mr-2" />
                Network Point
              </Button>
              <Button
                variant={drawingMode === 'line' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setDrawingMode('line')}
              >
                <Cable className="h-4 w-4 mr-2" />
                Draw Cable
              </Button>
              <Button
                variant={drawingMode === 'marker' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setDrawingMode('marker')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Add Label
              </Button>
              {drawingMode === 'line' && (
                <div className="pt-2 space-y-2 border-t mt-2">
                  <p className="text-xs text-muted-foreground">
                    Click on map to add points ({drawingPoints.length} points)
                  </p>
                  {drawingPoints.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Length: {Math.round(calculateCableLength(drawingPoints))}m
                    </p>
                  )}
                  {lastSnappedCable && (
                    <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Connected to: {lastSnappedCable}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Tip: Click near green dots to snap to existing cables
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={finishDrawing}
                      disabled={drawingPoints.length < 2}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Finish
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={cancelDrawing}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {drawingMode === 'marker' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Click on map to add a label
                </p>
              )}
              {drawingMode === 'customer_pin' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Click on map to assign customer location
                </p>
              )}
              {drawingMode === 'network_point' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Click on map to place FAT/Closure
                </p>
              )}
            </CardContent>
          </Card>

          {/* Layer Controls */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Layers className="h-4 w-4" />
                <span>Layers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Home className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Customers ({stats.customers})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleLayer('customers')}>
                  {layers.customers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Network className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Network Points ({stats.networkPoints})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleLayer('networkPoints')}>
                  {layers.networkPoints ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cable className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Cables ({stats.cables})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleLayer('cables')}>
                  {layers.cables ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Labels ({stats.labels})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleLayer('labels')}>
                  {layers.labels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className={autoSync ? 'ring-1 ring-green-500/30' : ''}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Stats</span>
                </div>
                <div className="flex items-center gap-2">
                  {syncing && (
                    <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  )}
                  {autoSync && !syncing && (
                    <div className="flex items-center gap-1">
                      <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* Live Status Controls */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-blue-500 animate-ping' : autoSync ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">
                    {syncing ? 'Syncing...' : lastSyncTime ? formatLastSyncTime() : 'Not synced'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => syncOnlineStatus(false)}
                    disabled={syncing}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Switch
                    id="gis-auto-sync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                  />
                  <Label htmlFor="gis-auto-sync" className="text-xs cursor-pointer">Auto</Label>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><div className={`w-2 h-2 bg-green-500 rounded-full ${autoSync ? 'animate-pulse' : ''}`} />Online</span>
                <span className="font-medium text-green-600">{stats.online}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" />Offline</span>
                <span className="font-medium text-red-600">{stats.customers - stats.online}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Cable className="h-3 w-3 text-blue-500" />Total Cable</span>
                  <span className="font-medium">
                    {stats.totalCableLength >= 1000
                      ? `${(stats.totalCableLength / 1000).toFixed(2)} km`
                      : `${Math.round(stats.totalCableLength)} m`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs">Cable segments</span>
                  <span className="text-xs">{stats.cables}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow" />
                <span>Online Customer</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow" />
                <span>Offline Customer</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-[2px] bg-blue-500 rounded" />
                <span>Drop Cable</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-1 bg-blue-500 rounded" />
                <span>Fiber/ADSS Cable</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-1.5 bg-blue-500 rounded" />
                <span>Trunk Line</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-orange-500 border-2 border-green-500 rounded shadow flex items-center justify-center text-xs">🔌</div>
                <span>Network Point</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Map Area */}
        <div className="lg:col-span-4">
          <Card className="h-[calc(100vh-200px)] min-h-[600px]">
            <CardHeader className="border-b py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Map className="h-5 w-5" />
                  <span>Network Map</span>
                  {drawingMode !== 'none' && (
                    <Badge variant="secondary">{drawingMode} mode</Badge>
                  )}
                </CardTitle>
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {stats.customers + stats.labels} points
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <NetworkMap
                center={mapCenter}
                zoom={13}
                customers={customers}
                fiberCables={fiberCables}
                labels={labels}
                networkPoints={networkPoints}
                drawingMode={drawingMode}
                drawingPoints={drawingPoints}
                showLayers={layers}
                onCustomerClick={(c) => setSelectedCustomer(c)}
                onCableClick={(c) => setSelectedCable(c)}
                onLabelClick={(l) => setSelectedLabel(l)}
                onNetworkPointClick={(p) => setSelectedNetworkPoint(p)}
                onMapClick={handleMapClick}
                onLineClick={handleLineClick}
                onSnapToEndpoint={(cableName) => {
                  setLastSnappedCable(cableName);
                  toast({ title: 'Snapped!', description: `Connected to "${cableName}"` });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setSelectedCustomer(null)}>
          <Card className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {selectedCustomer.username}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCustomer.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedCustomer.is_online ? 'default' : 'destructive'}>
                    {selectedCustomer.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedCustomer.connection_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedCustomer.address || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-mono text-sm">{selectedCustomer.latitude}, {selectedCustomer.longitude}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Label Detail Modal */}
      {selectedLabel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setSelectedLabel(null)}>
          <Card className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {selectedLabel.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLabel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedLabel.label_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-mono text-sm">{selectedLabel.latitude.toFixed(6)}, {selectedLabel.longitude.toFixed(6)}</p>
                </div>
              </div>
              {selectedLabel.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedLabel.description}</p>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={() => deleteLabel(selectedLabel.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Label
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cable Detail Modal */}
      {selectedCable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setSelectedCable(null)}>
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-5 w-5" />
                {selectedCable.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCable(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium uppercase">{selectedCable.cable_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedCable.status === 'active' ? 'default' : 'secondary'}>
                    {selectedCable.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fiber Count</p>
                  <p className="font-medium">{selectedCable.fiber_count} cores</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Length</p>
                  <p className="font-medium">{selectedCable.length_meters ? `${selectedCable.length_meters}m` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="font-medium">{selectedCable.coordinates.length} points</p>
                </div>
              </div>
              {selectedCable.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedCable.description}</p>
                </div>
              )}
              {selectedCable.core_signals && selectedCable.core_signals.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Core Signals</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {selectedCable.core_signals.map((cs) => (
                      <div key={cs.core} className="flex gap-2">
                        <span className="text-muted-foreground">Core {cs.core}:</span>
                        <span className="font-medium">{cs.signal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cable Edit Actions */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Edit Cable</p>

                {/* Trim from Start */}
                {selectedCable.coordinates.length > 2 && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground flex-1">Trim from start:</p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => trimCableFromStart(selectedCable, 1)}
                        title="Remove 1 point from start"
                      >
                        -1
                      </Button>
                      {selectedCable.coordinates.length > 4 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => trimCableFromStart(selectedCable, 2)}
                          title="Remove 2 points from start"
                        >
                          -2
                        </Button>
                      )}
                      {selectedCable.coordinates.length > 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => trimCableFromStart(selectedCable, 5)}
                          title="Remove 5 points from start"
                        >
                          -5
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Trim from End */}
                {selectedCable.coordinates.length > 2 && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground flex-1">Trim from end:</p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => trimCableFromEnd(selectedCable, 1)}
                        title="Remove 1 point from end"
                      >
                        -1
                      </Button>
                      {selectedCable.coordinates.length > 4 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => trimCableFromEnd(selectedCable, 2)}
                          title="Remove 2 points from end"
                        >
                          -2
                        </Button>
                      )}
                      {selectedCable.coordinates.length > 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => trimCableFromEnd(selectedCable, 5)}
                          title="Remove 5 points from end"
                        >
                          -5
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Split Cable */}
                {selectedCable.coordinates.length >= 3 && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground flex-1">Split at middle:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => splitCableAtPoint(selectedCable, Math.floor(selectedCable.coordinates.length / 2))}
                      title="Split cable into two parts at the middle"
                    >
                      Split Cable
                    </Button>
                  </div>
                )}
              </div>

              {/* Delete Actions */}
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => deleteCable(selectedCable.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Entire Cable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Label Modal */}
      {showAddLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowAddLabelModal(false)}>
          <Card className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Pin
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddLabelModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g., OLT-Main, Splitter-1"
                  value={newLabelData.name}
                  onChange={(e) => setNewLabelData({ ...newLabelData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                  value={newLabelData.label_type}
                  onChange={(e) => setNewLabelData({ ...newLabelData, label_type: e.target.value })}
                >
                  <option value="poi">Point of Interest</option>
                  <option value="olt">OLT</option>
                  <option value="splitter">Splitter</option>
                  <option value="fdt">FDT (Distribution)</option>
                  <option value="fat">FAT (Access Terminal)</option>
                </select>
              </div>
              <div>
                <Label>Coordinates</Label>
                <p className="font-mono text-sm text-muted-foreground">
                  {newLabelData.lat.toFixed(6)}, {newLabelData.lng.toFixed(6)}
                </p>
              </div>
              <Button onClick={saveLabel} disabled={!newLabelData.name} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Map
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Cable Modal */}
      {showAddCableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowAddCableModal(false)}>
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-5 w-5" />
                Add New Cable
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddCableModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Cable Name</Label>
                  <Input
                    placeholder="e.g., Main Trunk Line A"
                    value={newCableData.name}
                    onChange={(e) => setNewCableData({ ...newCableData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cable Type</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                    value={newCableData.cable_type}
                    onChange={(e) => setNewCableData({ ...newCableData, cable_type: e.target.value })}
                  >
                    <option value="drop">Drop Cable (thin)</option>
                    <option value="adss">ADSS Cable</option>
                    <option value="fiber">Fiber Cable</option>
                    <option value="trunk">Trunk Line</option>
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                    value={newCableData.status}
                    onChange={(e) => setNewCableData({ ...newCableData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <Label>Number of Cores</Label>
                  <Input
                    type="number"
                    min={1}
                    max={96}
                    value={newCableData.fiber_count}
                    onChange={(e) => handleFiberCountChange(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newCableData.color}
                      onChange={(e) => setNewCableData({ ...newCableData, color: e.target.value })}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{newCableData.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Cable Length</Label>
                <p className="text-sm font-medium">{Math.round(calculateCableLength(drawingPoints))} meters ({drawingPoints.length} points)</p>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Core Signals</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Define what signal each core carries (leave empty for unused cores)
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {newCableData.core_signals.map((cs, index) => (
                    <div key={cs.core} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">Core {cs.core}:</span>
                      <Input
                        placeholder="e.g., Internet"
                        className="h-8 text-sm"
                        value={cs.signal}
                        onChange={(e) => updateCoreSignal(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <textarea
                  className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-foreground resize-none"
                  placeholder="Additional notes about this cable..."
                  value={newCableData.description}
                  onChange={(e) => setNewCableData({ ...newCableData, description: e.target.value })}
                />
              </div>

              <Button onClick={saveCable} disabled={!newCableData.name} className="w-full">
                <Cable className="h-4 w-4 mr-2" />
                Save Cable
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Network Point Modal */}
      {showNetworkPointModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowNetworkPointModal(false)}>
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Add Network Point
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNetworkPointModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Point Name</Label>
                  <Input
                    placeholder="e.g., FAT-001, Closure-Main"
                    value={newNetworkPointData.name}
                    onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Point Type</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                    value={newNetworkPointData.point_type}
                    onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, point_type: e.target.value })}
                  >
                    <option value="fat">FAT (Access Terminal)</option>
                    <option value="closure">Closure</option>
                    <option value="splitter">Splitter</option>
                    <option value="olt">OLT</option>
                    <option value="fdt">FDT (Distribution)</option>
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                    value={newNetworkPointData.status}
                    onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <Label>Capacity (Ports)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={96}
                    value={newNetworkPointData.capacity}
                    onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, capacity: parseInt(e.target.value) || 8 })}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newNetworkPointData.color}
                      onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, color: e.target.value })}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{newNetworkPointData.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Coordinates</Label>
                <p className="font-mono text-sm text-muted-foreground">
                  {networkPointLocation.lat.toFixed(6)}, {networkPointLocation.lng.toFixed(6)}
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Available Signals</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Add signals available for new clients at this point
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="e.g., Internet, TV, Phone"
                    value={newSignalInput}
                    onChange={(e) => setNewSignalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSignalToNetworkPoint())}
                  />
                  <Button size="sm" onClick={addSignalToNetworkPoint} disabled={!newSignalInput.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newNetworkPointData.available_signals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newNetworkPointData.available_signals.map((signal, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {signal}
                        <button onClick={() => removeSignalFromNetworkPoint(index)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <textarea
                  className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-foreground resize-none"
                  placeholder="Additional notes about this network point..."
                  value={newNetworkPointData.description}
                  onChange={(e) => setNewNetworkPointData({ ...newNetworkPointData, description: e.target.value })}
                />
              </div>

              <Button onClick={saveNetworkPoint} disabled={!newNetworkPointData.name} className="w-full">
                <Network className="h-4 w-4 mr-2" />
                Save Network Point
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Location Labeling Modal */}
      {showCustomerPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowCustomerPinModal(false)}>
          <Card className="w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Label Customer Location
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCustomerPinModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <Label>Selected Location</Label>
                <p className="font-mono text-sm text-muted-foreground">
                  {customerPinLocation.lat.toFixed(6)}, {customerPinLocation.lng.toFixed(6)}
                </p>
              </div>

              <div>
                <Label>Search Unlabeled Customers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, username, or address..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md">
                {filteredUnlabeledCustomers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {unlabeledCustomers.length === 0
                      ? 'All customers have been labeled!'
                      : 'No customers match your search'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredUnlabeledCustomers.slice(0, 20).map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 cursor-pointer transition-colors hover:bg-muted ${selectedCustomerForPin?.id === customer.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                          }`}
                        onClick={() => setSelectedCustomerForPin(customer)}
                      >
                        <div className="font-medium">{customer.full_name || customer.username}</div>
                        <div className="text-sm text-muted-foreground">@{customer.username}</div>
                        {customer.address && (
                          <div className="text-xs text-muted-foreground mt-1">{customer.address}</div>
                        )}
                      </div>
                    ))}
                    {filteredUnlabeledCustomers.length > 20 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        Showing first 20 of {filteredUnlabeledCustomers.length} customers
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={labelCustomerLocation}
                disabled={!selectedCustomerForPin}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Assign Location to {selectedCustomerForPin?.full_name || selectedCustomerForPin?.username || 'Customer'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Network Point Detail Modal */}
      {selectedNetworkPoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setSelectedNetworkPoint(null)}>
          <Card className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                {selectedNetworkPoint.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNetworkPoint(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium uppercase">{selectedNetworkPoint.point_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedNetworkPoint.status === 'active' ? 'default' : 'secondary'}>
                    {selectedNetworkPoint.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-medium">{selectedNetworkPoint.used_ports}/{selectedNetworkPoint.capacity} ports used</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-mono text-xs">{selectedNetworkPoint.latitude.toFixed(6)}, {selectedNetworkPoint.longitude.toFixed(6)}</p>
                </div>
              </div>
              {selectedNetworkPoint.available_signals && selectedNetworkPoint.available_signals.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Available Signals</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNetworkPoint.available_signals.map((signal, index) => (
                      <Badge key={index} variant="outline">{signal}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedNetworkPoint.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedNetworkPoint.description}</p>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={() => deleteNetworkPoint(selectedNetworkPoint.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Network Point
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
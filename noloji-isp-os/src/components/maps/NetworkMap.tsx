'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

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
    plan_name?: string;
}

interface FiberCable {
    id: number;
    name: string;
    description?: string;
    coordinates: [number, number][];
    cable_type: string;
    length_meters?: number;
    fiber_count?: number;
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

interface NetworkMapProps {
    center?: [number, number];
    zoom?: number;
    customers?: Customer[];
    fiberCables?: FiberCable[];
    labels?: GISLabel[];
    networkPoints?: NetworkPoint[];
    drawingMode?: 'none' | 'line' | 'marker' | 'delete' | 'network_point' | 'customer_pin';
    drawingPoints?: [number, number][];
    onCustomerClick?: (customer: Customer) => void;
    onCableClick?: (cable: FiberCable) => void;
    onLabelClick?: (label: GISLabel) => void;
    onNetworkPointClick?: (point: NetworkPoint) => void;
    onMapClick?: (lat: number, lng: number) => void;
    onLineClick?: (lat: number, lng: number) => void;
    onSnapToEndpoint?: (cableName: string) => void;
    showLayers?: {
        customers: boolean;
        cables: boolean;
        labels: boolean;
        networkPoints: boolean;
    };
}

function NetworkMapClient({
    center = [-1.2921, 36.8219],
    zoom = 13,
    customers = [],
    fiberCables = [],
    labels = [],
    networkPoints = [],
    drawingMode = 'none',
    drawingPoints = [],
    onCustomerClick,
    onCableClick,
    onLabelClick,
    onNetworkPointClick,
    onMapClick,
    onLineClick,
    onSnapToEndpoint,
    showLayers = { customers: true, cables: true, labels: true, networkPoints: true }
}: NetworkMapProps) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const leafletRef = useRef<any>(null);
    const componentsRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);

    // Store drawingMode in ref to access in event handlers
    const drawingModeRef = useRef(drawingMode);
    useEffect(() => {
        drawingModeRef.current = drawingMode;
    }, [drawingMode]);

    useEffect(() => {
        let mounted = true;

        const loadLeaflet = async () => {
            try {
                // Import leaflet CSS
                await import('leaflet/dist/leaflet.css');

                // Import modules
                const [leafletModule, reactLeafletModule] = await Promise.all([
                    import('leaflet'),
                    import('react-leaflet')
                ]);

                if (!mounted) return;

                const L = leafletModule.default;

                // Fix default marker icons
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                });

                leafletRef.current = L;
                componentsRef.current = reactLeafletModule;
                setIsReady(true);
            } catch (err: any) {
                console.error('Failed to load map:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load map');
                }
            }
        };

        loadLeaflet();

        return () => {
            mounted = false;
        };
    }, []);

    // Auto-fit bounds when data changes
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapInstanceRef.current;

        if (!map || !L) return;

        const allCoords: [number, number][] = [];

        customers.forEach(c => {
            if (c.latitude && c.longitude) {
                allCoords.push([c.latitude, c.longitude]);
            }
        });

        labels.forEach(l => {
            if (l.latitude && l.longitude) {
                allCoords.push([l.latitude, l.longitude]);
            }
        });

        fiberCables.forEach(cable => {
            if (cable.coordinates) {
                cable.coordinates.forEach(coord => {
                    allCoords.push(coord);
                });
            }
        });

        if (allCoords.length > 0) {
            try {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) {
                // Ignore bounds errors
            }
        }
    }, [customers, fiberCables, labels, isReady]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-950">
                <p className="text-red-600">Error: {error}</p>
            </div>
        );
    }

    if (!isReady || !componentsRef.current) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted" style={{ minHeight: '400px' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading map...</p>
                </div>
            </div>
        );
    }

    const L = leafletRef.current;
    const { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } = componentsRef.current;

    // Create custom icons
    const createCustomerIcon = (isOnline: boolean) => {
        return new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="
        width: 24px; 
        height: 24px; 
        background: ${isOnline ? '#22c55e' : '#ef4444'}; 
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    };

    const createLabelIcon = (type: string, color: string) => {
        const icons: Record<string, string> = {
            'olt': '📡',
            'splitter': '🔀',
            'fdt': '📦',
            'fat': '📍',
            'poi': '📌'
        };
        return new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="
        width: 28px; 
        height: 28px; 
        background: ${color || '#8b5cf6'}; 
        border: 2px solid white; 
        border-radius: 6px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
      ">${icons[type] || '📌'}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    };

    // Calculate distance between two points in meters (Haversine formula)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000; // Earth's radius in meters
        const toRad = (deg: number) => deg * (Math.PI / 180);
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Get all cable endpoints for snapping
    const getCableEndpoints = (): { lat: number; lng: number; cableId: number; cableName: string; isStart: boolean }[] => {
        const endpoints: { lat: number; lng: number; cableId: number; cableName: string; isStart: boolean }[] = [];
        fiberCables.forEach(cable => {
            if (cable.coordinates && cable.coordinates.length >= 2) {
                const first = cable.coordinates[0];
                const last = cable.coordinates[cable.coordinates.length - 1];
                endpoints.push({ lat: first[0], lng: first[1], cableId: cable.id, cableName: cable.name, isStart: true });
                endpoints.push({ lat: last[0], lng: last[1], cableId: cable.id, cableName: cable.name, isStart: false });
            }
        });
        return endpoints;
    };

    // Find nearest cable endpoint within snap threshold
    const findNearestEndpoint = (lat: number, lng: number, thresholdMeters: number = 15): { lat: number; lng: number; cableName: string } | null => {
        const endpoints = getCableEndpoints();
        let nearest: { lat: number; lng: number; cableName: string; distance: number } | null = null;

        for (const ep of endpoints) {
            const distance = calculateDistance(lat, lng, ep.lat, ep.lng);
            if (distance <= thresholdMeters) {
                if (!nearest || distance < nearest.distance) {
                    nearest = { lat: ep.lat, lng: ep.lng, cableName: ep.cableName, distance };
                }
            }
        }

        return nearest ? { lat: nearest.lat, lng: nearest.lng, cableName: nearest.cableName } : null;
    };

    // Map click handler component
    const MapClickHandler = () => {
        const map = useMapEvents({
            click: (e: any) => {
                console.log('Map clicked, mode:', drawingModeRef.current);
                if (drawingModeRef.current === 'marker' && onMapClick) {
                    onMapClick(e.latlng.lat, e.latlng.lng);
                } else if (drawingModeRef.current === 'line' && onLineClick) {
                    // Check for snap to existing cable endpoint
                    const snapPoint = findNearestEndpoint(e.latlng.lat, e.latlng.lng);
                    if (snapPoint) {
                        console.log(`Snapped to cable: ${snapPoint.cableName}`);
                        onLineClick(snapPoint.lat, snapPoint.lng);
                        onSnapToEndpoint && onSnapToEndpoint(snapPoint.cableName);
                    } else {
                        onLineClick(e.latlng.lat, e.latlng.lng);
                    }
                } else if (drawingModeRef.current === 'network_point' && onMapClick) {
                    onMapClick(e.latlng.lat, e.latlng.lng);
                } else if (drawingModeRef.current === 'customer_pin' && onMapClick) {
                    onMapClick(e.latlng.lat, e.latlng.lng);
                }
            }
        });

        // Store map reference
        useEffect(() => {
            mapInstanceRef.current = map;
        }, [map]);

        return null;
    };

    // Create network point icon
    const createNetworkPointIcon = (type: string, color: string, capacity: number, usedPorts: number) => {
        const icons: Record<string, string> = {
            'fat': '🔌',
            'closure': '📦',
            'splitter': '🔀',
            'olt': '📡',
            'fdt': '📤'
        };
        const utilization = capacity > 0 ? (usedPorts / capacity) * 100 : 0;
        const ringColor = utilization > 80 ? '#ef4444' : utilization > 50 ? '#f97316' : '#22c55e';

        return new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="
                width: 32px;
                height: 32px;
                background: ${color || '#f97316'};
                border: 3px solid ${ringColor};
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                cursor: pointer;
            ">${icons[type] || '🔌'}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    };

    // Calculate cable weight based on type and core count
    const getCableWeight = (cableType: string, fiberCount?: number): number => {
        switch (cableType) {
            case 'drop':
                return 2; // Very thin for drop cables
            case 'adss':
                // ADSS thickness varies by core count
                if (!fiberCount) return 4;
                if (fiberCount <= 12) return 4;
                if (fiberCount <= 24) return 5;
                if (fiberCount <= 48) return 6;
                if (fiberCount <= 72) return 7;
                return 8; // 96 cores or more
            case 'trunk':
                return 6;
            case 'fiber':
            default:
                return 4;
        }
    };

    // Cursor style based on drawing mode
    const cursorStyle = ['marker', 'line', 'network_point', 'customer_pin'].includes(drawingMode) ? 'crosshair' : 'grab';

    return (
        <div style={{ height: '100%', width: '100%', cursor: cursorStyle }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', minHeight: '400px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler />

                {/* Drawing Preview - Show polyline while drawing */}
                {drawingMode === 'line' && drawingPoints.length > 0 && (
                    <Polyline
                        positions={drawingPoints}
                        pathOptions={{
                            color: '#f97316',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '10, 10'
                        }}
                    />
                )}

                {/* Drawing Points Markers */}
                {drawingMode === 'line' && drawingPoints.map((point, index) => (
                    <Marker
                        key={`draw-point-${index}`}
                        position={point}
                        icon={new L.DivIcon({
                            className: 'custom-div-icon',
                            html: `<div style="
                                width: 12px;
                                height: 12px;
                                background: #f97316;
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            "></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        })}
                    />
                ))}

                {/* Fiber Cables */}
                {showLayers.cables && fiberCables.map((cable) => (
                    <Polyline
                        key={`cable-${cable.id}`}
                        positions={cable.coordinates}
                        pathOptions={{
                            color: cable.color || '#3b82f6',
                            weight: getCableWeight(cable.cable_type, cable.fiber_count),
                            opacity: 0.8,
                            dashArray: cable.status === 'planned' ? '10, 10' : undefined
                        }}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent.stopPropagation();
                                onCableClick && onCableClick(cable);
                            }
                        }}
                    >
                        <Tooltip sticky>
                            <div>
                                <strong>{cable.name}</strong><br />
                                {cable.cable_type.toUpperCase()} • {cable.fiber_count || 12} cores
                            </div>
                        </Tooltip>
                    </Polyline>
                ))}

                {/* Labels/POIs */}
                {showLayers.labels && labels.map((label) => (
                    <Marker
                        key={`label-${label.id}`}
                        position={[label.latitude, label.longitude]}
                        icon={createLabelIcon(label.label_type, label.color)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                onLabelClick && onLabelClick(label);
                            }
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>{label.name}</strong><br />
                                <span style={{ textTransform: 'capitalize' }}>{label.label_type}</span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Network Points (FAT, Closures, etc.) */}
                {showLayers.networkPoints && networkPoints.map((point) => (
                    <Marker
                        key={`network-point-${point.id}`}
                        position={[point.latitude, point.longitude]}
                        icon={createNetworkPointIcon(point.point_type, point.color, point.capacity, point.used_ports)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                onNetworkPointClick && onNetworkPointClick(point);
                            }
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>{point.name}</strong><br />
                                <span style={{ textTransform: 'uppercase' }}>{point.point_type}</span><br />
                                <span>{point.used_ports}/{point.capacity} ports used</span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Customer markers */}
                {showLayers.customers && customers.filter(c => c.latitude && c.longitude).map((customer) => (
                    <Marker
                        key={`customer-${customer.id}`}
                        position={[customer.latitude!, customer.longitude!]}
                        icon={createCustomerIcon(customer.is_online || false)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                onCustomerClick && onCustomerClick(customer);
                            }
                        }}
                    >
                        <Tooltip>
                            <div>
                                <strong>{customer.username}</strong><br />
                                {customer.full_name || 'No name'}<br />
                                <span style={{ color: customer.is_online ? '#22c55e' : '#ef4444' }}>
                                    {customer.is_online ? '● Online' : '○ Offline'}
                                </span>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}

                {/* Cable Endpoint Snap Points - Rendered LAST to appear on top of all markers */}
                {drawingMode === 'line' && getCableEndpoints().map((endpoint, index) => (
                    <Marker
                        key={`snap-point-${index}`}
                        position={[endpoint.lat, endpoint.lng]}
                        zIndexOffset={1000}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent?.stopPropagation();
                                // Directly trigger the snap when clicking the snap point
                                if (onLineClick) {
                                    onLineClick(endpoint.lat, endpoint.lng);
                                    onSnapToEndpoint && onSnapToEndpoint(endpoint.cableName);
                                }
                            }
                        }}
                        icon={new L.DivIcon({
                            className: 'snap-point-icon',
                            html: `<div style="
                                width: 20px;
                                height: 20px;
                                background: rgba(34, 197, 94, 0.4);
                                border: 3px solid #22c55e;
                                border-radius: 50%;
                                box-shadow: 0 0 12px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.4);
                                animation: pulse 1.2s ease-in-out infinite;
                                cursor: pointer;
                                z-index: 10000;
                            "></div>
                            <style>
                                @keyframes pulse {
                                    0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.4); }
                                    50% { transform: scale(1.3); box-shadow: 0 0 20px rgba(34, 197, 94, 1), 0 0 30px rgba(34, 197, 94, 0.6); }
                                }
                            </style>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    >
                        <Tooltip>
                            <div className="text-xs">
                                <strong>Click to snap</strong><br />
                                {endpoint.cableName} ({endpoint.isStart ? 'start' : 'end'})
                            </div>
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

// Export with SSR disabled
export const NetworkMap = dynamic(() => Promise.resolve(NetworkMapClient), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-muted" style={{ minHeight: '400px' }}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading map...</p>
            </div>
        </div>
    )
});

export default NetworkMap;

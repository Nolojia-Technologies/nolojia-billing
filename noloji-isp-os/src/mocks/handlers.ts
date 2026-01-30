import { http, HttpResponse } from 'msw';
import {
  mockData,
  mockCustomers,
  mockDevices,
  mockTechnicians,
  mockJobs,
  mockBillingRecords,
  mockHotspots,
  mockVouchers,
  mockAlerts
} from './data';
import {
  Customer,
  Device,
  PaginatedResponse,
  ApiResponse,
  DeviceAdoptionForm,
  CustomerFilters,
  DeviceFilters
} from '@/lib/types';

// Helper function to simulate network delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for paginated responses
function paginate<T extends object>(
  data: T[],
  page: number = 1,
  limit: number = 10,
  filters?: any
): PaginatedResponse<T> {
  let filteredData = [...data];

  // Apply filters if provided
  if (filters) {
    if (filters.search) {
      filteredData = filteredData.filter((item: any) =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    }
    if (filters.status && 'status' in filteredData[0]) {
      filteredData = filteredData.filter((item: any) => item.status === filters.status);
    }
    if (filters.online !== undefined && 'online' in filteredData[0]) {
      filteredData = filteredData.filter((item: any) => item.online === filters.online);
    }
  }

  const total = filteredData.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total,
    page,
    limit,
    hasMore: endIndex < total
  };
}

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    await delay(800);
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'admin@noloji.com' && body.password === 'password') {
      const user = mockData.users[0];
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-12345',
          user
        }
      });
    }

    return HttpResponse.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    }, { status: 401 });
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await delay(200);
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No valid token provided' }
      }, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: mockData.users[0]
    });
  }),

  // Customer endpoints
  http.get('/api/customers', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const filters: CustomerFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') as Customer['status'] || undefined,
      planId: url.searchParams.get('planId') || undefined
    };

    const result = paginate(mockCustomers, page, limit, filters);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  http.get('/api/customers/:id', async ({ params }) => {
    await delay(300);
    const customer = mockCustomers.find(c => c.id === params.id);

    if (!customer) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' }
      }, { status: 404 });
    }

    // Add billing history to customer
    const billingHistory = mockBillingRecords.filter(b => b.customerId === customer.id);

    return HttpResponse.json({
      success: true,
      data: { ...customer, billingHistory }
    });
  }),

  http.post('/api/customers', async ({ request }) => {
    await delay(800);
    const body = await request.json() as Omit<Customer, 'id' | 'createdAt'>;

    const newCustomer: Customer = {
      ...body,
      id: `cust_${String(mockCustomers.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString()
    };

    mockCustomers.push(newCustomer);

    return HttpResponse.json({
      success: true,
      data: newCustomer
    });
  }),

  http.put('/api/customers/:id', async ({ params, request }) => {
    await delay(600);
    const customerIndex = mockCustomers.findIndex(c => c.id === params.id);

    if (customerIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' }
      }, { status: 404 });
    }

    const updates = await request.json() as Partial<Customer>;
    mockCustomers[customerIndex] = { ...mockCustomers[customerIndex], ...updates };

    return HttpResponse.json({
      success: true,
      data: mockCustomers[customerIndex]
    });
  }),

  // Device endpoints
  http.get('/api/devices', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const filters: DeviceFilters = {
      search: url.searchParams.get('search') || undefined,
      type: url.searchParams.get('type') as Device['type'] || undefined,
      online: url.searchParams.get('online') ? url.searchParams.get('online') === 'true' : undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined
    };

    const result = paginate(mockDevices, page, limit, filters);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  http.get('/api/devices/:id', async ({ params }) => {
    await delay(300);
    const device = mockDevices.find(d => d.id === params.id);

    if (!device) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Device not found' }
      }, { status: 404 });
    }

    return HttpResponse.json({
      success: true,
      data: device
    });
  }),

  http.post('/api/devices/adopt', async ({ request }) => {
    await delay(1200); // Longer delay for device adoption
    const body = await request.json() as DeviceAdoptionForm;

    // Simulate device adoption process
    const newDevice: Device = {
      id: `dev_${String(mockDevices.length + 1).padStart(4, '0')}`,
      type: 'mikrotik_router',
      model: 'RB4011iGS+',
      serial: body.serialOrMac,
      mac: body.serialOrMac.includes(':') ? body.serialOrMac : 'DC:2C:6E:00:00:00',
      ip: `10.0.1.${100 + mockDevices.length}`,
      online: true,
      firmware: 'v7.8.1',
      assignedTo: body.customerId,
      lastSeen: new Date().toISOString(),
      config: {
        template: body.templateId,
        vlan: 100,
        bandwidth: { upload: 2, download: 10 }
      },
      metrics: {
        cpu: 10,
        memory: 30,
        uptime: 0,
        trafficRx: 0,
        trafficTx: 0,
        signalStrength: -60
      }
    };

    mockDevices.push(newDevice);

    return HttpResponse.json({
      success: true,
      data: {
        device: newDevice,
        configPreview: `# Generated configuration for ${newDevice.model}
/interface ethernet
set [ find default-name=ether1 ] comment="WAN"
set [ find default-name=ether2 ] comment="LAN"

/ip pool
add name=dhcp ranges=192.168.1.10-192.168.1.100

/ip dhcp-server
add address-pool=dhcp disabled=no interface=ether2 name=dhcp1

/ppp profile
add dns-server=8.8.8.8,8.8.4.4 local-address=192.168.1.1 name=profile1 remote-address=dhcp

# Template: ${body.templateId}
# Bandwidth: Upload ${newDevice.config?.bandwidth.upload}Mbps, Download ${newDevice.config?.bandwidth.download}Mbps`
      }
    });
  }),

  http.get('/api/devices/:id/config', async ({ params }) => {
    await delay(400);
    const device = mockDevices.find(d => d.id === params.id);

    if (!device) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Device not found' }
      }, { status: 404 });
    }

    const config = `# Configuration for ${device.model} (${device.id})
/interface ethernet
set [ find default-name=ether1 ] comment="WAN"
set [ find default-name=ether2 ] comment="LAN"

/ip address
add address=192.168.1.1/24 interface=ether2

/ip pool
add name=dhcp ranges=192.168.1.10-192.168.1.100

/ip dhcp-server
add address-pool=dhcp disabled=no interface=ether2 name=dhcp1

/queue simple
add max-limit=${device.config?.bandwidth.upload || 2}M/${device.config?.bandwidth.download || 10}M name="bandwidth-limit" target=ether2`;

    return HttpResponse.json({
      success: true,
      data: { config, device }
    });
  }),

  http.post('/api/devices/:id/commands', async ({ params, request }) => {
    await delay(1000); // Command execution delay
    const body = await request.json() as { command: string };

    const device = mockDevices.find(d => d.id === params.id);
    if (!device) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Device not found' }
      }, { status: 404 });
    }

    // Simulate command responses
    let response = '';
    switch (body.command) {
      case 'reboot':
        response = 'Device reboot initiated successfully';
        break;
      case 'factory-reset':
        response = 'Factory reset command sent to device';
        break;
      default:
        response = `Command "${body.command}" executed on ${device.model}`;
    }

    return HttpResponse.json({
      success: true,
      data: { output: response, timestamp: new Date().toISOString() }
    });
  }),

  // Technician endpoints
  http.get('/api/technicians', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const result = paginate(mockTechnicians, page, limit);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  http.post('/api/technicians/:id/shift/start', async ({ params }) => {
    await delay(300);
    const technicianIndex = mockTechnicians.findIndex(t => t.id === params.id);

    if (technicianIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Technician not found' }
      }, { status: 404 });
    }

    mockTechnicians[technicianIndex].currentStatus = 'idle';
    mockTechnicians[technicianIndex].location = {
      lat: -1.2921,
      lng: 36.8219,
      timestamp: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockTechnicians[technicianIndex]
    });
  }),

  http.post('/api/technicians/:id/shift/stop', async ({ params }) => {
    await delay(300);
    const technicianIndex = mockTechnicians.findIndex(t => t.id === params.id);

    if (technicianIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Technician not found' }
      }, { status: 404 });
    }

    mockTechnicians[technicianIndex].currentStatus = 'off-shift';
    mockTechnicians[technicianIndex].location = undefined;

    return HttpResponse.json({
      success: true,
      data: mockTechnicians[technicianIndex]
    });
  }),

  // Job endpoints
  http.get('/api/jobs', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const result = paginate(mockJobs, page, limit);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  // Billing endpoints
  http.get('/api/invoices', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customerId');

    let filteredBilling = [...mockBillingRecords];
    if (status) {
      filteredBilling = filteredBilling.filter(b => b.status === status);
    }
    if (customerId) {
      filteredBilling = filteredBilling.filter(b => b.customerId === customerId);
    }

    const result = paginate(filteredBilling, page, limit);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  http.post('/api/invoices/:id/pay', async ({ params, request }) => {
    await delay(2000); // Payment processing delay
    const body = await request.json() as { paymentMethod: string; amount: number };

    const billingIndex = mockBillingRecords.findIndex(b => b.id === params.id);
    if (billingIndex === -1) {
      return HttpResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found' }
      }, { status: 404 });
    }

    // Simulate payment success/failure
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      mockBillingRecords[billingIndex].status = 'paid';
      mockBillingRecords[billingIndex].paidAt = new Date().toISOString();
      mockBillingRecords[billingIndex].paymentMethod = body.paymentMethod as any;

      return HttpResponse.json({
        success: true,
        data: {
          transaction: {
            id: `txn_${Date.now()}`,
            status: 'completed',
            amount: body.amount,
            method: body.paymentMethod
          }
        }
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: 'Payment processing failed. Please try again.' }
      }, { status: 400 });
    }
  }),

  // Hotspot endpoints
  http.get('/api/hotspots', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const result = paginate(mockHotspots, page, limit);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  http.post('/api/hotspots/:id/vouchers', async ({ params, request }) => {
    await delay(800);
    const body = await request.json() as {
      count: number;
      type: 'time' | 'data';
      value: number;
      price: number;
    };

    const vouchers = [];
    for (let i = 0; i < body.count; i++) {
      const voucher = {
        id: `voucher_${Date.now()}_${i}`,
        code: `${body.type.toUpperCase()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        hotspotId: params.id as string,
        type: body.type,
        value: body.value,
        price: body.price,
        currency: 'KES' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      vouchers.push(voucher);
      mockVouchers.push(voucher);
    }

    return HttpResponse.json({
      success: true,
      data: vouchers
    });
  }),

  // GIS/Fiber endpoints
  http.get('/api/gis/routes', async () => {
    await delay(600);
    return HttpResponse.json({
      success: true,
      data: mockData.fiberRoutes
    });
  }),

  http.post('/api/gis/routes', async ({ request }) => {
    await delay(1000);
    const body = await request.json() as any;

    const newRoute = {
      id: `route_${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString()
    };

    mockData.fiberRoutes.push(newRoute);

    return HttpResponse.json({
      success: true,
      data: newRoute
    });
  }),

  http.get('/api/gis/suggest-splitter', async ({ request }) => {
    await delay(1500); // AI processing delay
    const url = new URL(request.url);
    const routeId = url.searchParams.get('routeId');

    // Simulate AI splitter suggestion
    const suggestions = ['1:2', '1:4', '1:8', '1:16'];
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100

    return HttpResponse.json({
      success: true,
      data: {
        routeId,
        suggestion,
        predictedLossDb: 8.5 + Math.random() * 10,
        supportedCustomers: parseInt(suggestion.split(':')[1]) * 6,
        confidence,
        reasoning: `Based on fiber length, customer density, and signal loss calculations, a ${suggestion} splitter is recommended with ${confidence}% confidence.`
      }
    });
  }),

  // Dashboard/Analytics endpoints
  http.get('/api/dashboard/kpis', async () => {
    await delay(400);
    return HttpResponse.json({
      success: true,
      data: {
        totalCustomers: mockCustomers.length,
        activeCustomers: mockCustomers.filter(c => c.status === 'active').length,
        activeSessions: Math.floor(mockCustomers.length * 0.75),
        revenue30d: 2450000,
        revenueChange: '+15.3%',
        networkUptime: 99.8,
        bandwidthUsage: 78.5,
        onlineDevices: mockDevices.filter(d => d.online).length,
        totalDevices: mockDevices.length,
        activeAlerts: mockAlerts.filter(a => a.status === 'active').length
      }
    });
  }),

  // Alerts endpoint
  http.get('/api/alerts', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const result = paginate(mockAlerts, page, limit);

    return HttpResponse.json({
      success: true,
      data: result
    });
  }),

  // Plans endpoint
  http.get('/api/plans', async () => {
    await delay(200);
    return HttpResponse.json({
      success: true,
      data: mockData.plans
    });
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  })
];
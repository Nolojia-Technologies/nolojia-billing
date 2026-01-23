# Nolojia Landlord ISP Platform - System Architecture

## 1. Executive Summary

The Nolojia Landlord ISP Platform is a multi-tenant SaaS solution that enables property owners (landlords) to redistribute internet services to their tenants while Nolojia maintains complete technical control of the infrastructure.

### Key Principles
- **Landlords are NOT ISPs** - They are resellers with limited visibility
- **Nolojia owns all technical infrastructure** - Routers, credentials, configurations
- **Simplicity for landlords** - Dashboard shows payments, not technical details
- **Security first** - Complete data isolation between tenants

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOLOJIA CLOUD PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Landlord       │  │  Nolojia Admin  │  │  Full ISP       │             │
│  │  Dashboard      │  │  Dashboard      │  │  Dashboard      │             │
│  │  (Restricted)   │  │  (Full Control) │  │  (Advanced)     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│  ┌─────────────────────────────▼─────────────────────────────────────────┐ │
│  │                         API GATEWAY                                    │ │
│  │  • Authentication (Supabase Auth)                                     │ │
│  │  • Role-Based Access Control                                          │ │
│  │  • Rate Limiting                                                       │ │
│  └─────────────────────────────┬─────────────────────────────────────────┘ │
│                                │                                            │
│  ┌──────────────┬──────────────┼──────────────┬──────────────┐             │
│  │              │              │              │              │             │
│  ▼              ▼              ▼              ▼              ▼             │
│ ┌────────┐ ┌────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │Landlord│ │Building│ │ Customer   │ │  Billing   │ │  Router    │        │
│ │Service │ │Service │ │ Service    │ │  Service   │ │  Service   │        │
│ └────────┘ └────────┘ └────────────┘ └────────────┘ └────────────┘        │
│                                │              │              │             │
│  ┌─────────────────────────────▼──────────────▼──────────────▼───────────┐│
│  │                      SUPABASE (PostgreSQL)                            ││
│  │  • Row Level Security (RLS)                                           ││
│  │  • Encrypted Credentials Storage                                       ││
│  │  • Real-time Subscriptions                                            ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Secure API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MIKROTIK MANAGEMENT SERVICE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Runs on Nolojia infrastructure ONLY                                      │
│  • Stores encrypted RouterOS credentials                                    │
│  • Executes: Enable/Disable users, Speed control, Bandwidth limits          │
│  • Landlords have ZERO direct access                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌──────────┐     ┌──────────┐
              │ Building │     │ Building │     │ Building │
              │ Router A │     │ Router B │     │ Router C │
              └──────────┘     └──────────┘     └──────────┘
```

---

## 3. Role & Permission Matrix

### 3.1 User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `super_admin` | Nolojia platform administrators | Full system access |
| `nolojia_staff` | Nolojia support staff | Manage landlords, buildings, technical |
| `full_isp` | Full ISP operators (advanced) | Full ISP features, GIS, etc. |
| `landlord_admin` | Landlord account owner | View-only dashboard, payments |
| `landlord_staff` | Landlord's employees | Limited view access |

### 3.2 Permission Matrix

| Permission | super_admin | nolojia_staff | full_isp | landlord_admin | landlord_staff |
|------------|-------------|---------------|----------|----------------|----------------|
| **Landlord Management** |
| Create landlords | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit landlord profile | ✅ | ✅ | ❌ | Own only | ❌ |
| Delete landlords | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Building Management** |
| Create buildings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit buildings | ✅ | ✅ | ❌ | ❌ | ❌ |
| View buildings | ✅ | ✅ | Own | Own | Own |
| **Unit/House Management** |
| Create units | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit units | ✅ | ✅ | ❌ | ❌ | ❌ |
| View units | ✅ | ✅ | Own | Own | Own |
| **Customer Management** |
| Create customers | ✅ | ✅ | Own | ❌ | ❌ |
| Edit customers | ✅ | ✅ | Own | ❌ | ❌ |
| View customers | ✅ | ✅ | Own | Own | Own |
| **Router Management** |
| Add routers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure routers | ✅ | ✅ | ❌ | ❌ | ❌ |
| View router status | ✅ | ✅ | ❌ | ❌ | ❌ |
| View credentials | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Billing & Payments** |
| View all payments | ✅ | ✅ | Own | Own | Own |
| Process payments | ✅ | ✅ | Own | ❌ | ❌ |
| Generate invoices | ✅ | ✅ | Own | ❌ | ❌ |
| View reports | ✅ | ✅ | Own | Own | ❌ |
| Configure payouts | ✅ | ✅ | ❌ | Own | ❌ |
| **Technical Operations** |
| Enable/disable user | ✅ | ✅ | Own | ❌ | ❌ |
| Change speed package | ✅ | ✅ | Own | ❌ | ❌ |
| View GIS maps | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Database Schema

### 4.1 Core Tables

```sql
-- Organizations (Nolojia, Full ISPs, Landlords)
organizations
├── id (uuid, PK)
├── name
├── type (nolojia | full_isp | landlord)
├── status (active | suspended | pending)
├── settings (jsonb)
├── created_at
└── updated_at

-- Landlord-specific details
landlords
├── id (uuid, PK)
├── organization_id (FK → organizations)
├── contact_name
├── contact_email
├── contact_phone
├── address
├── payout_method (mpesa | bank)
├── payout_details (jsonb, encrypted)
├── commission_rate (decimal)
├── created_at
└── updated_at

-- Buildings managed by landlords
landlord_buildings
├── id (uuid, PK)
├── landlord_id (FK → landlords)
├── name
├── address
├── city
├── total_units
├── status (active | inactive)
├── created_at
└── updated_at

-- Individual units/houses in buildings
units
├── id (uuid, PK)
├── building_id (FK → landlord_buildings)
├── unit_number
├── floor
├── type (apartment | shop | office)
├── status (vacant | occupied | maintenance)
├── created_at
└── updated_at

-- Internet packages
packages
├── id (uuid, PK)
├── organization_id (FK → organizations, nullable for global)
├── name
├── speed_mbps
├── price
├── billing_cycle (monthly | weekly | daily)
├── is_active
├── created_at
└── updated_at

-- Customers (tenants)
landlord_customers
├── id (uuid, PK)
├── landlord_id (FK → landlords)
├── unit_id (FK → units)
├── name
├── phone
├── email
├── national_id
├── pppoe_username
├── status (active | suspended | disconnected)
├── created_at
└── updated_at

-- Customer subscriptions
subscriptions
├── id (uuid, PK)
├── customer_id (FK → landlord_customers)
├── package_id (FK → packages)
├── start_date
├── end_date
├── status (active | expired | cancelled)
├── auto_renew
├── created_at
└── updated_at

-- Payment records
payments
├── id (uuid, PK)
├── subscription_id (FK → subscriptions)
├── customer_id (FK → landlord_customers)
├── amount
├── payment_method (mpesa | cash | bank)
├── transaction_ref
├── status (pending | completed | failed)
├── paid_at
├── created_at
└── updated_at

-- Routers (Nolojia-managed)
routers
├── id (uuid, PK)
├── name
├── ip_address (encrypted)
├── api_port
├── username (encrypted)
├── password (encrypted)
├── router_type (mikrotik | ubiquiti)
├── status (online | offline | maintenance)
├── last_seen
├── created_at
└── updated_at

-- Router assignments to buildings
router_assignments
├── id (uuid, PK)
├── router_id (FK → routers)
├── building_id (FK → landlord_buildings)
├── assigned_at
├── assigned_by (FK → users)
└── is_active

-- User accounts
users
├── id (uuid, PK, matches Supabase auth.users)
├── organization_id (FK → organizations)
├── landlord_id (FK → landlords, nullable)
├── email
├── full_name
├── role (super_admin | nolojia_staff | full_isp | landlord_admin | landlord_staff)
├── is_active
├── last_login
├── created_at
└── updated_at

-- Audit log
audit_logs
├── id (uuid, PK)
├── user_id (FK → users)
├── action
├── table_name
├── record_id
├── old_values (jsonb)
├── new_values (jsonb)
├── ip_address
├── created_at
```

### 4.2 Row Level Security (RLS) Strategy

```sql
-- Landlords can only see their own data
-- Buildings visible only to owning landlord + Nolojia
-- Units visible only through building ownership chain
-- Customer data isolated per landlord
-- Router data NEVER visible to landlords
-- Payments visible to landlord for their customers only
```

---

## 5. User Flows

### 5.1 Landlord Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     LANDLORD DASHBOARD FLOW                       │
└──────────────────────────────────────────────────────────────────┘

1. LOGIN
   └─→ Email/Password authentication
       └─→ Redirect to Landlord Dashboard

2. DASHBOARD (Home)
   ├─→ Revenue Summary (This month, Last month, Total)
   ├─→ Active Tenants Count
   ├─→ Payment Status Overview (Paid vs Unpaid)
   └─→ Recent Activity

3. BUILDINGS VIEW
   ├─→ List of assigned buildings
   └─→ Click building → View Units
       └─→ Unit list with tenant status (Paid/Unpaid)

4. PAYMENTS VIEW
   ├─→ Payment history table
   ├─→ Filter by: Building, Month, Status
   └─→ Export to CSV/PDF

5. REPORTS
   ├─→ Monthly revenue report
   ├─→ Collection rate report
   └─→ Download reports

6. SETTINGS
   ├─→ Profile information
   └─→ Payout method configuration
```

### 5.2 Nolojia Admin Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     NOLOJIA ADMIN FLOW                           │
└──────────────────────────────────────────────────────────────────┘

1. LOGIN (Nolojia credentials)

2. DASHBOARD
   ├─→ Total landlords
   ├─→ Total buildings
   ├─→ Total active customers
   ├─→ Revenue metrics
   └─→ System health (Router status)

3. LANDLORD MANAGEMENT
   ├─→ Create new landlord
   │   ├─→ Company details
   │   ├─→ Contact information
   │   └─→ Commission rate
   ├─→ Edit landlord
   ├─→ Suspend/Activate landlord
   └─→ View landlord details

4. BUILDING MANAGEMENT
   ├─→ Create building (assign to landlord)
   │   ├─→ Building details
   │   ├─→ Number of units
   │   └─→ Auto-generate units
   ├─→ Assign router to building
   └─→ Manage units

5. CUSTOMER MANAGEMENT
   ├─→ Add customer to unit
   │   ├─→ Customer details
   │   ├─→ Select package
   │   └─→ Auto-create PPPoE credentials
   ├─→ Edit customer
   ├─→ Suspend/Disconnect customer
   └─→ Change package

6. ROUTER MANAGEMENT
   ├─→ Add router (credentials encrypted)
   ├─→ Test connection
   ├─→ Assign to building
   └─→ View status

7. BILLING OPERATIONS
   ├─→ Generate invoices
   ├─→ Process payments
   ├─→ Bulk operations
   └─→ Payout processing
```

---

## 6. MikroTik Enforcement Logic

### 6.1 Enforcement Rules

```javascript
// Enforcement triggers:
// 1. Subscription expired → Disable PPPoE user
// 2. Payment received → Enable PPPoE user
// 3. Package change → Update speed profile
// 4. Manual suspend → Disable PPPoE user

// Enforcement service runs:
// - On payment webhook
// - On subscription expiry (scheduled job)
// - On manual action from admin
```

### 6.2 RouterOS Commands (Backend Only)

```javascript
// NEVER exposed to frontend
// All commands executed by backend service

// Disable user
/ppp/secret/disable [find name="username"]

// Enable user
/ppp/secret/enable [find name="username"]

// Update speed profile
/ppp/secret/set [find name="username"] profile="plan_name"

// Add new user
/ppp/secret/add name="username" password="password" profile="plan_name" service=pppoe
```

---

## 7. Billing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BILLING FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

1. INVOICE GENERATION (Monthly/Automatic)
   │
   ├─→ System checks all active subscriptions
   ├─→ Generates invoice for upcoming period
   ├─→ Sends notification to customer (SMS/Email)
   └─→ Invoice status: PENDING

2. PAYMENT PROCESSING
   │
   ├─→ M-Pesa STK Push / Manual Payment
   ├─→ Payment recorded in system
   ├─→ Invoice status: PAID
   │
   └─→ AUTOMATIC ENFORCEMENT
       └─→ Enable customer on router (if was disabled)

3. NON-PAYMENT HANDLING
   │
   ├─→ Grace period (configurable, e.g., 3 days)
   ├─→ Send reminder notifications
   │
   └─→ After grace period:
       ├─→ Disable customer on router
       ├─→ Mark as OVERDUE
       └─→ Continue sending reminders

4. LANDLORD PAYOUT
   │
   ├─→ Calculate landlord's share (revenue - commission)
   ├─→ Generate payout report
   └─→ Process payout (M-Pesa/Bank)

Revenue Split Example:
┌──────────────────────────────────────────────┐
│ Customer pays: KES 2,000                     │
│ Nolojia commission (30%): KES 600            │
│ Landlord receives: KES 1,400                 │
└──────────────────────────────────────────────┘
```

---

## 8. Security Model

### 8.1 Data Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SECURITY BOUNDARIES                              │
└─────────────────────────────────────────────────────────────────────┘

LANDLORD A                    LANDLORD B
┌──────────────┐              ┌──────────────┐
│ Buildings A  │              │ Buildings B  │
│ Units A      │   ✗ BLOCKED  │ Units B      │
│ Customers A  │ ◄──────────► │ Customers B  │
│ Payments A   │              │ Payments B   │
└──────────────┘              └──────────────┘
       │                             │
       └────────────┬────────────────┘
                    │
            NOLOJIA (Full Access)
            ┌──────────────┐
            │ All Data     │
            │ All Routers  │
            │ All Secrets  │
            └──────────────┘
```

### 8.2 Security Measures

1. **Authentication**: Supabase Auth with MFA option
2. **Authorization**: Row Level Security (RLS) on all tables
3. **Encryption**: Router credentials encrypted at rest
4. **Audit Trail**: All actions logged
5. **API Security**: Rate limiting, input validation
6. **Network**: RouterOS API only accessible from backend

---

## 9. Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema creation
- [ ] RLS policies implementation
- [ ] Authentication setup
- [ ] Basic API endpoints

### Phase 2: Admin Dashboard (Week 3-4)
- [ ] Landlord management UI
- [ ] Building/Unit management UI
- [ ] Customer management UI
- [ ] Router management UI

### Phase 3: Landlord Dashboard (Week 5-6)
- [ ] Landlord dashboard UI
- [ ] Payment views
- [ ] Reports
- [ ] Settings

### Phase 4: Enforcement & Billing (Week 7-8)
- [ ] MikroTik enforcement service
- [ ] Payment processing
- [ ] Invoice generation
- [ ] Payout system

### Phase 5: Testing & Launch (Week 9-10)
- [ ] Integration testing
- [ ] Security audit
- [ ] Performance testing
- [ ] Production deployment

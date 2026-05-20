# WalkTheFloor — Restaurant Operations Platform

## Context

Build a comprehensive restaurant operations platform for multi-location QSR chains, inspired by WorkPulse rOS. The platform covers 4 modules: Brand Standards & Food Safety (checklists), Audit Management, Facilities Maintenance, and Guest Service. Mobile-first PWA for field workers, desktop views for managers/admins. Deploys to Dokploy via Docker.

Based on analysis of a live WorkPulse instance (see `WORKPULSE-PATTERNS.md` and `/screenshots/`), the Book (checklists) module uses an **equipment-centric model**: equipment types are defined at the org level, assigned to locations with quantities, and tasks are scheduled at specific time slots per equipment. Non-equipment tasks (cleaning checklists, yes/no questions) are handled separately. We adopt a **hybrid approach** — keeping ChecklistTemplates for flexibility while adding Equipment as a first-class concept with time-slot scheduling.

**SaaS product** — sold as a subscription service. Includes a SaaS admin portal (pattern from `manage-cater-saas`) for managing organizations, subscriptions, billing, support tickets, and knowledge base. Guest complaints and sales data arrive via **inbound webhooks** from POS/external systems. Tenant admins can generate **API keys** to expose compliance data, reports, and checklist results to their own systems.

**Phase 1 scope**: Checklists & Food Safety module + full platform foundation (auth, multi-tenancy, RBAC, app shell, PWA) + SaaS platform layer (subscriptions, webhooks, API keys).

---

## Tech Stack (Proven from Hisab + Cater.app)

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router, standalone) | ^16.2.6 |
| React | React | 19.2.4 |
| Database | PostgreSQL + Prisma | @prisma/client ^7.5 |
| Auth | NextAuth.js (JWT, Credentials) | ^5.0.0-beta.31 |
| CSS | Tailwind v4 (CSS-first, no config file) | ^4 |
| UI | shadcn + Lucide icons | ^4.4 |
| Validation | Zod | ^4.3.6 |
| Charts | Recharts | ^3.8 |
| Toasts | Sonner | ^2.0 |
| Password | bcryptjs | ^3.0 |
| Payments | Stripe (subscriptions + webhooks) | ^18 |
| Email | Resend (outbound + inbound webhooks) | ^4 |
| SMS | Twilio (critical compliance failures only) | ^5 |
| Photo Storage | S3-compatible (Cloudflare R2) | — |
| Docker | node:20-alpine, multi-stage | — |
| Deploy | Dokploy | — |

---

## SaaS Architecture

Two-tier system following the `manage-cater-saas` pattern:

### Tier 1: SaaS Admin Portal (`/saas-admin/*`)
- **Who**: WalkTheFloor staff (SUPER_ADMIN, ADMIN roles)
- **What**: Manage organizations, subscriptions, billing, provisioning, support tickets, **webhook & API key setup per org**, template library management
- **Auth**: Separate `SaasAdmin` table (not the User table). NextAuth has a dedicated third credential provider for SaaS admin login. JWT includes `saasAdminId` + `saasRole`.
- **Pattern**: Direct from manage-cater-saas — AuditLog, SystemSettings, account management actions

### Tier 2: Tenant Application (`/dashboard/*`)
- **Who**: Restaurant org users (Franchisee → RGM → Team Member)
- **What**: Checklists, audits, maintenance, guest service — the operational app
- **Auth**: Same NextAuth, org-scoped data isolation via `organizationId`
- **No visibility**: Tenants cannot see or manage API keys, webhook endpoints, or integration config — that is entirely SaaS admin territory

### Webhooks & API Keys (SaaS Admin Managed)
All integration setup is done by SaaS admins as part of org onboarding/configuration. Tenants never see these settings.

**Inbound Webhooks** — external systems push data into WalkTheFloor:
- **Guest Complaints**: POS systems, email integrations, social media → creates Complaint records
- **Sales Data**: POS systems push transaction/revenue data → stored for correlation with ops metrics
- Each organization gets a unique webhook URL: `/api/webhooks/{orgSlug}/{channel}`
- All events logged to `WebhookEvent` table before processing
- Signature verification per channel (HMAC with per-endpoint secret)
- Configured by SaaS admin at `/saas-admin/organizations/{orgId}/integrations`

**Outbound API Keys** — SaaS admins generate keys for an org's external systems:
- Read-only access to compliance data, checklist results, temperature logs, CA status
- Scoped by module and location
- Rate-limited, audited
- Managed at `/saas-admin/organizations/{orgId}/api-keys`
- API endpoints under `/api/v1/*` accept `Authorization: Bearer {api_key}`

---

## Project Structure

```
walkthefloor/
├── app/
│   ├── (auth)/                          # Public auth pages
│   │   ├── login/page.tsx               # Email/password login
│   │   ├── saas-login/page.tsx          # SaaS admin login (separate credential provider)
│   │   ├── pin-login/page.tsx           # PIN-based device login — URL: /pin-login?device=abc123
│   │   ├── pricing/page.tsx             # Plan pricing page (self-serve path)
│   │   ├── signup/page.tsx              # Self-serve signup → Stripe Checkout
│   │   └── layout.tsx                   # Centered card layout
│   ├── (dashboard)/                     # Protected app shell
│   │   ├── layout.tsx                   # AppShell: sidebar (desktop) + bottom nav (mobile)
│   │   ├── page.tsx                     # Home dashboard (redirect by role)
│   │   ├── checklists/                  # MODULE 1: Brand Standards & Food Safety
│   │   │   ├── page.tsx                 # Book Dashboard — KPIs, radial chart, category cards
│   │   │   ├── tasks/page.tsx           # Task Dashboard — compliance grid (date × equipment)
│   │   │   ├── daily/page.tsx           # Daily Tasks — printable view per location
│   │   │   ├── progress/page.tsx        # Task Progress — weekly completion % by user
│   │   │   ├── adherence/page.tsx       # Checklist Adherence — location × checklist grid + failure counts (Manager+)
│   │   │   ├── failures/page.tsx       # Compliance Failures — excuse submission (RGM), review queue (Manager+)
│   │   │   ├── compliance/page.tsx      # Task Compliance — shift-level by category
│   │   │   ├── [instanceId]/page.tsx    # Execute a checklist (THE key mobile screen)
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx             # List/manage templates (admin)
│   │   │   │   ├── new/page.tsx         # Create template
│   │   │   │   └── [templateId]/page.tsx # Edit template
│   │   │   ├── corrective-actions/
│   │   │   │   └── page.tsx             # CA list with filters, card layout, detail panel
│   │   │   ├── temperature/
│   │   │   │   └── page.tsx             # Temperature logs & compliance
│   │   │   └── reports/
│   │   │       └── page.tsx             # CA % closed heatmap, compliance reports
│   │   ├── audits/                      # MODULE 2 (Phase 2)
│   │   ├── maintenance/                 # MODULE 3 (Phase 3)
│   │   ├── guest-service/              # MODULE 4 (Phase 4)
│   │   ├── documents/                   # SOPs & policy docs
│   │   │   └── page.tsx
│   │   ├── support/                     # Support tickets (customer side)
│   │   │   └── page.tsx                 # My tickets list + create ticket
│   │   ├── help/page.tsx                # Knowledge base / help articles
│   │   └── admin/                       # Tenant administration
│   │       ├── organization/page.tsx    # Org profile & app settings (tabbed per-module)
│   │       ├── locations/page.tsx       # Location CRUD with Book/Audit config tabs
│   │       ├── locations/[locationId]/
│   │       │   └── book/page.tsx        # Per-location equipment + task config
│   │       ├── equipment/page.tsx       # Equipment type catalog (org-level)
│   │       ├── users/page.tsx           # User management with hierarchy
│   │       ├── shifts/page.tsx          # Shift definitions (AM/PM/Overnight)
│   │       ├── roles/page.tsx           # Role & permission editor
│   │       └── devices/page.tsx         # Registered devices (MDR)
│   ├── (saas-admin)/                    # SaaS platform admin (ADMIN/SUPER_ADMIN only)
│   │   ├── layout.tsx                   # Separate admin layout
│   │   ├── saas-admin/
│   │   │   ├── page.tsx                 # SaaS dashboard — org count, MRR, active users
│   │   │   ├── organizations/page.tsx   # All organizations list + provisioning
│   │   │   ├── organizations/[orgId]/page.tsx  # Org detail — subscription, users, usage
│   │   │   ├── organizations/[orgId]/integrations/page.tsx  # Webhook endpoints + API keys for this org
│   │   │   ├── organizations/[orgId]/webhook-log/page.tsx   # Webhook event log for this org
│   │   │   ├── subscriptions/page.tsx   # Subscription management + plan assignment
│   │   │   ├── plans/page.tsx           # Plan tier configuration
│   │   │   ├── support/page.tsx         # All support tickets across orgs
│   │   │   ├── support/[ticketId]/page.tsx    # Ticket detail + admin reply
│   │   │   ├── knowledge-base/page.tsx  # KB article management (CRUD)
│   │   │   ├── templates/page.tsx       # Brand template library (master templates, copy to/from orgs)
│   │   │   ├── webhook-logs/page.tsx    # Global webhook event log
│   │   │   ├── audit-log/page.tsx       # Admin action audit trail
│   │   │   ├── discounts/page.tsx       # Discount code management
│   │   │   └── settings/page.tsx        # System settings (maintenance mode, etc.)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── health/route.ts
│   │   ├── setup/route.ts              # Runs prisma migrate deploy + seed (Dokploy pattern)
│   │   ├── v1/
│   │   │   ├── checklists/             # Checklist template CRUD
│   │   │   ├── instances/              # Daily checklist instances
│   │   │   ├── completions/            # Task completion submissions
│   │   │   ├── corrective-actions/     # CA CRUD + status transitions
│   │   │   ├── temperature-logs/       # Temp reading submissions
│   │   │   ├── equipment-types/        # Equipment type catalog CRUD
│   │   │   ├── equipment/              # Per-location equipment instances
│   │   │   ├── shifts/                 # Shift CRUD
│   │   │   ├── documents/              # SOP/policy CRUD
│   │   │   ├── reports/                # Report generation + compliance data
│   │   │   ├── users/                  # User management
│   │   │   ├── locations/              # Location management
│   │   │   ├── roles/                  # Role management
│   │   │   └── devices/                # Device registration
│   │   ├── webhooks/
│   │   │   └── [orgSlug]/
│   │   │       └── [channel]/route.ts  # Inbound webhook receiver (complaints, sales, generic)
│   │   ├── resend/
│   │   │   └── inbound/route.ts        # Resend inbound webhook — transforms email payload → webhook pipeline → creates Complaint
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts       # Create Stripe checkout session
│   │   │   ├── portal/route.ts         # Customer billing portal link
│   │   │   └── webhook/route.ts        # Stripe webhook receiver
│   │   ├── saas-admin/                 # SaaS admin API routes
│   │   │   ├── organizations/route.ts  # Org CRUD + provisioning
│   │   │   ├── organizations/[orgId]/
│   │   │   │   ├── api-keys/route.ts   # API key CRUD for an org
│   │   │   │   └── webhooks/route.ts   # Webhook endpoint CRUD for an org
│   │   │   ├── subscriptions/route.ts  # Subscription management
│   │   │   ├── support/route.ts        # Ticket management
│   │   │   ├── knowledge-base/route.ts # KB article CRUD
│   │   │   └── audit-log/route.ts      # Audit log queries
│   │   └── cron/
│   │       ├── generate-checklists/route.ts  # Daily checklist instance generation
│   │       └── flag-overdue/route.ts         # Mark overdue tasks
│   ├── layout.tsx                       # Root layout (providers, fonts, PWA meta)
│   ├── globals.css                      # Tailwind v4 theme + custom properties
│   └── manifest.ts                      # PWA manifest (dynamic)
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx                # Responsive shell (sidebar + bottom nav)
│   │   ├── sidebar.tsx                  # Desktop sidebar navigation
│   │   ├── bottom-nav.tsx               # Mobile bottom tab bar
│   │   ├── top-bar.tsx                  # Header with location selector + user menu
│   │   └── location-selector.tsx        # Org/location switcher
│   ├── ui/                              # shadcn components (auto-generated)
│   ├── forms/
│   │   ├── checklist-builder.tsx        # Template builder (drag-drop tasks)
│   │   ├── task-field-renderer.tsx      # Renders task by type (yes/no, temp, photo, etc.)
│   │   ├── equipment-config.tsx         # Per-location equipment assignment + tasks
│   │   ├── signature-pad.tsx            # Touch signature capture
│   │   ├── image-upload.tsx             # Camera capture + file upload
│   │   └── pin-input.tsx               # 4-6 digit PIN entry
│   ├── data/
│   │   ├── data-table.tsx               # TanStack Table wrapper
│   │   ├── compliance-grid.tsx          # Date × equipment grid (Task Dashboard)
│   │   ├── status-badge.tsx             # Color-coded status pills
│   │   ├── score-ring.tsx               # Circular/radial score display
│   │   └── compliance-bar.tsx           # Compliance % bar
│   └── dashboard/
│       ├── stats-card.tsx               # KPI card (Open, Overdue, Completed, All)
│       ├── compliance-chart.tsx         # Recharts compliance over time
│       ├── category-carousel.tsx        # Category card carousel (Book Dashboard)
│       └── location-overview.tsx        # Multi-location summary grid
├── lib/
│   ├── auth.ts                          # NextAuth config (credentials + PIN provider)
│   ├── auth.config.ts                   # Shared auth config (path-based authorization)
│   ├── prisma.ts                        # Prisma client singleton
│   ├── api-utils.ts                     # withAuth wrapper, error handling, response format
│   ├── permissions.ts                   # Permission constants + check helpers
│   ├── validators/                      # Zod schemas by domain
│   │   ├── checklist.ts
│   │   ├── equipment.ts
│   │   ├── user.ts
│   │   ├── location.ts
│   │   └── webhook.ts
│   ├── services/                        # Business logic (decoupled from HTTP)
│   │   ├── checklist-service.ts
│   │   ├── instance-service.ts
│   │   ├── corrective-action-service.ts
│   │   ├── temperature-service.ts
│   │   ├── equipment-service.ts
│   │   ├── document-service.ts
│   │   ├── compliance-service.ts        # Compliance calculations + aggregations
│   │   ├── user-service.ts
│   │   ├── webhook-service.ts           # Inbound webhook processing + routing
│   │   ├── api-key-service.ts           # API key generation, validation, scoping
│   │   ├── notification-service.ts      # In-app bell + email (Resend) + SMS (Twilio) dispatch
│   │   └── storage-service.ts           # Presigned URL generation for R2 uploads
│   ├── saas/                            # SaaS platform layer (from manage-cater-saas pattern)
│   │   ├── admin-actions.ts             # Suspend, reactivate, provision, extend trial
│   │   ├── subscription-service.ts      # Plan management, Stripe sync
│   │   ├── support-service.ts           # Ticket CRUD, admin replies
│   │   ├── knowledge-base-service.ts    # KB article CRUD
│   │   └── audit-log.ts                # Admin action logging
│   ├── stripe.ts                        # Stripe client + helpers
│   ├── twilio.ts                        # Twilio client (SMS for critical compliance failures, ref stocktrack pattern)
│   ├── resend.ts                        # Resend client (all outbound email + inbound webhook handling)
│   ├── r2.ts                            # Cloudflare R2 client (S3-compatible photo storage)
│   └── utils.ts                         # cn(), formatDate, etc.
├── prisma/
│   ├── schema.prisma                    # Complete data model (all 4 modules)
│   └── seed.ts                          # Dev seed data
├── public/
│   ├── icons/                           # PWA icons (192, 512)
│   └── sw.js                            # Service worker (Serwist)
├── Dockerfile                           # Proven Dokploy pattern
├── .env.example
├── package.json
└── next.config.ts                       # output: "standalone"
```

---

## Database Schema (All 4 Modules)

### Core Platform Models

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ── MULTI-TENANCY ──────────────────────────────────

model Organization {
  id        String     @id @default(cuid())
  name      String
  slug      String     @unique
  settings  Json       @default("{}")   // Per-module config (see OrgSettings type below)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  regions        Region[]
  locations      Location[]
  users          User[]
  roles          Role[]
  shifts         Shift[]
  equipmentTypes EquipmentType[]
  documents      Document[]
}

// OrgSettings JSON structure:
// {
//   book: {
//     taskExpiryMinutes: 15,
//     sendDailySummaryEmails: false,
//     criticalTaskIds: [],
//     ca: { retakeReadingOnCA: false, defaultDueDays: 2 },
//     defaultDashboardCategories: []
//   },
//   general: { timezone: "America/New_York" }
// }

model Region {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  locations      Location[]
  @@index([organizationId])
}

model Shift {
  id             String       @id @default(cuid())
  name           String                    // "AM", "PM", "Overnight"
  startTime      String                    // "05:00" (HH:MM format)
  endTime        String                    // "13:00"
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@unique([name, organizationId])
  @@index([organizationId])
}

model Location {
  id                  String       @id @default(cuid())
  name                String
  storeNumber         String?                // PC Number / store ID
  address             String?
  latitude            Float?
  longitude           Float?
  geoFenceRadius      Int?                   // meters, null = no geo-fence
  timezone            String       @default("America/New_York")
  operatingHours      Json?                  // { mon: { open: "05:00", close: "23:00" }, ... }
  complianceStartDate DateTime?              // When to start tracking compliance
  isActive            Boolean      @default(true)
  organizationId      String
  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  regionId            String?
  region              Region?      @relation(fields: [regionId], references: [id])
  userLocations       UserLocation[]
  homeUsers           User[]       @relation("HomeLocation")
  // Equipment at this location
  locationEquipment   LocationEquipment[]
  // Per-location compliance window overrides
  templateConfigs     LocationTemplateConfig[]
  // Module relations
  checklistInstances  ChecklistInstance[]
  correctiveActions   CorrectiveAction[]
  temperatureLogs     TemperatureLog[]
  // Phase 2+
  auditInstances      AuditInstance[]
  workOrders          WorkOrder[]
  complaints          Complaint[]
  @@index([organizationId])
}

// Per-location overrides for checklist template compliance windows.
// When cloning config, everything is copied (equipment + tasks + ordering).
// Locations can override the default compliance windows from the template.
model LocationTemplateConfig {
  id             String            @id @default(cuid())
  locationId     String
  location       Location          @relation(fields: [locationId], references: [id], onDelete: Cascade)
  templateId     String
  template       ChecklistTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  windowOverrides Json             @default("[]")  // Override default windows: [{ start: "06:00", end: "10:00", label: "AM" }, ...]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  @@unique([locationId, templateId])
  @@index([locationId])
}

// ── USERS & AUTH ───────────────────────────────────

model User {
  id             String       @id @default(cuid())
  email          String?      @unique    // null for PIN-only users
  hashedPassword String?                 // null for PIN-only users
  pin            String?                 // 4-6 digit PIN for device login
  name           String
  title          String?                 // Job title: "Restaurant General Manager", "Multi-unit Manager"
  userType       String       @default("full")  // "full" | "pin_only"
  isActive       Boolean      @default(true)
  isConfirmed    Boolean      @default(false)
  lastLoginAt    DateTime?
  hireDate       DateTime?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  roleId         String
  role           Role         @relation(fields: [roleId], references: [id])
  managerId      String?                 // Self-reference for reporting chain
  manager        User?        @relation("ManagerReports", fields: [managerId], references: [id])
  directReports  User[]       @relation("ManagerReports")
  homeLocationId String?                 // Primary location
  homeLocation   Location?    @relation("HomeLocation", fields: [homeLocationId], references: [id])
  userLocations  UserLocation[]          // Additional assigned locations
  appAccess      Json         @default("[]")  // ["checklists","audits","maintenance","guest_service","admin","documents","reports"]
  // Module relations
  completions        TaskCompletion[]
  assignedCAs        CorrectiveAction[] @relation("CAAssignee")
  createdCAs         CorrectiveAction[] @relation("CACreator")
  temperatureLogs    TemperatureLog[]
  // Phase 2+
  auditCompletions   AuditResponse[]
  workOrdersAssigned WorkOrder[]        @relation("WOAssignee")
  workOrdersCreated  WorkOrder[]        @relation("WOCreator")
  workOrdersApproved WorkOrder[]        @relation("WOApprover")
  complaintsAssigned Complaint[]        @relation("ComplaintAssignee")
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId])
  @@index([pin, organizationId])
  @@index([managerId])
}

model UserLocation {
  userId     String
  locationId String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  @@id([userId, locationId])
}

model Role {
  id             String       @id @default(cuid())
  name           String
  permissions    Json         // ["checklists.view", "checklists.complete", "checklists.manage", ...]
  isBuiltIn      Boolean      @default(false)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  users          User[]
  @@unique([name, organizationId])
  @@index([organizationId])
}

model RegisteredDevice {
  id             String   @id @default(cuid())
  name           String                    // "Front Counter iPad"
  deviceToken    String   @unique          // Generated token for this device
  locationId     String
  make           String?                   // "Apple iPad", "Samsung Galaxy Tab"
  osVersion      String?
  isActive       Boolean  @default(true)
  lastUsedAt     DateTime?
  createdAt      DateTime @default(now())
}

// ── EQUIPMENT (Phase 1 — moved up from Phase 3) ───

model EquipmentType {
  id             String       @id @default(cuid())
  name           String                    // "Walkin Freezer", "Dairy Dispenser", "Hot Holding Unit"
  category       String?                   // "Refrigeration", "Beverage", "Cooking"
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  locationEquipment LocationEquipment[]
  checklistTasks ChecklistTask[]           // Task templates for this equipment type
  @@unique([name, organizationId])
  @@index([organizationId])
}

model LocationEquipment {
  id              String        @id @default(cuid())
  locationId      String
  location        Location      @relation(fields: [locationId], references: [id], onDelete: Cascade)
  equipmentTypeId String
  equipmentType   EquipmentType @relation(fields: [equipmentTypeId], references: [id], onDelete: Cascade)
  instanceName    String                   // "Walkin Freezer 1", "Reachin Cooler 2"
  sortOrder       Int           @default(0)
  isActive        Boolean       @default(true)
  // Phase 3 fields (populated later)
  model           String?
  serialNumber    String?
  installDate     DateTime?
  warrantyExpiry  DateTime?
  workOrders      WorkOrder[]
  createdAt       DateTime      @default(now())
  @@index([locationId])
  @@index([equipmentTypeId])
}

// ── MODULE 1: CHECKLISTS & FOOD SAFETY ─────────────

model ChecklistTemplate {
  id             String       @id @default(cuid())
  name           String
  description    String?
  category       String?                   // "Book Logs", "Food Safety", "Opening", "Closing", "Custom"
  isBuiltIn      Boolean      @default(false) // true for system templates (Book Logs, Opening, Closing, Food Safety)
  isCustom       Boolean      @default(false) // true for org-created custom checklists
  schedule       Json
  // Schedule JSON — supports multiple frequency patterns:
  //
  // ── Interval-based (generates N instances per day with compliance windows) ──
  // Every 4h:  { frequency: "every_4h",  windows: [
  //               { start: "05:00", end: "09:00" },
  //               { start: "09:00", end: "13:00" },
  //               { start: "13:00", end: "17:00" },
  //               { start: "17:00", end: "21:00" },
  //               { start: "21:00", end: "01:00" },
  //               { start: "01:00", end: "05:00" }
  //             ]}
  // Every 8h:  { frequency: "every_8h",  windows: [
  //               { start: "05:00", end: "13:00" },
  //               { start: "13:00", end: "21:00" },
  //               { start: "21:00", end: "05:00" }
  //             ]}
  // Every 12h: { frequency: "every_12h", windows: [
  //               { start: "05:00", end: "17:00" },
  //               { start: "17:00", end: "05:00" }
  //             ]}
  //
  // ── Daily (1x or 2x with compliance windows) ──
  // Daily 2x:  { frequency: "daily", timesPerDay: 2, windows: [
  //               { start: "05:00", end: "11:00", label: "AM" },
  //               { start: "14:00", end: "20:00", label: "PM" }
  //             ]}
  // Daily 1x:  { frequency: "daily", timesPerDay: 1, windows: [
  //               { start: "05:00", end: "08:00", label: "Opening" }
  //             ]}
  //
  // ── Weekly (specific days, with compliance windows) ──
  // Weekly:    { frequency: "weekly", days: ["mon","wed"], windows: [
  //               { start: "05:00", end: "23:00" }
  //             ]}
  //
  // ── Monthly ──
  // Monthly:   { frequency: "monthly", dayOfMonth: 1, windows: [
  //               { start: "00:00", end: "23:59" }
  //             ]}
  //
  // ── Custom interval ──
  // Custom:    { frequency: "custom", intervalDays: 14, windows: [
  //               { start: "00:00", end: "23:59" }
  //             ]}
  //
  // Each window defines the COMPLIANCE PERIOD — the checklist must be
  // completed within start→end to be compliant. After the window closes,
  // the instance is marked MISSED and a ComplianceFailure record is created.
  //
  // Built-in examples:
  //   Book Logs:              { frequency: "every_12h", windows: [
  //                               { start: "05:00", end: "11:00", label: "AM" },
  //                               { start: "14:00", end: "20:00", label: "PM" }
  //                           ]}
  //   Opening Checklist:      { frequency: "daily", timesPerDay: 1, windows: [
  //                               { start: "05:00", end: "08:00", label: "Opening" }
  //                           ]}
  //   Closing Checklist:      { frequency: "daily", timesPerDay: 1, windows: [
  //                               { start: "20:00", end: "23:00", label: "Closing" }
  //                           ]}
  //   Food Safety Assessment: { frequency: "monthly", dayOfMonth: 1, windows: [
  //                               { start: "00:00", end: "23:59" }
  //                           ]}
  isActive       Boolean      @default(true)
  version        Int          @default(1)
  organizationId String
  tasks          ChecklistTask[]
  instances      ChecklistInstance[]
  locationConfigs LocationTemplateConfig[]
  complianceFailures ComplianceFailure[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId])
  @@index([category])
}

model ChecklistTask {
  id              String            @id @default(cuid())
  templateId      String
  template        ChecklistTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  equipmentTypeId String?                   // null = non-equipment task
  equipmentType   EquipmentType?    @relation(fields: [equipmentTypeId], references: [id])
  title           String
  description     String?
  taskType        TaskType
  config          Json              @default("{}")  // { min, max, target, unit, choices, etc. }
  scheduledTime   String?                   // "05:00", "09:00", "13:00", "17:00" — null = anytime
  sortOrder       Int
  isRequired      Boolean           @default(true)
  isCritical      Boolean           @default(false) // Flag for critical task email alerts
  requiresPhoto       Boolean       @default(false)
  requiresSignature   Boolean       @default(false)
  helpText        String?
  completions     TaskCompletion[]
  @@index([templateId])
  @@index([equipmentTypeId])
}

// config JSON examples:
// Temperature: { min: -10, max: 0, target: -5, unit: "F" }
// Yes/No:      { expectedAnswer: "no" }  (for "Are pests present?" → target: No)
// Select:      { choices: ["Clean", "Dirty", "N/A"] }

enum TaskType {
  YES_NO
  TEMPERATURE
  NUMERIC
  TEXT
  SELECT
  MULTI_SELECT
  PHOTO_ONLY
  SIGNATURE_ONLY
}

model ChecklistInstance {
  id           String            @id @default(cuid())
  templateId   String
  template     ChecklistTemplate @relation(fields: [templateId], references: [id])
  locationId   String
  location     Location          @relation(fields: [locationId], references: [id])
  date         DateTime          @db.Date
  windowLabel  String?                    // "AM", "PM", "Opening", "Closing", "05:00-09:00"
  windowStart  DateTime?                  // Compliance window opens (must complete after this)
  windowEnd    DateTime?                  // Compliance window closes (MISSED if not done by this)
  status       InstanceStatus    @default(PENDING)
  isCompliant  Boolean?                   // null=pending, true=completed within window, false=completed late or missed
  completedAt  DateTime?
  completions  TaskCompletion[]
  complianceFailure ComplianceFailure?    // Created when window closes without completion
  createdAt    DateTime          @default(now())
  @@unique([templateId, locationId, date, windowLabel])
  @@index([locationId, date])
  @@index([status])
}

enum InstanceStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  MISSED         // Window closed without completion
  COMPLETED_LATE // Completed after window closed
}

// ── COMPLIANCE FAILURE TRACKING ────────────────────
// Created automatically when a checklist instance window closes without completion.
// Managers can provide an explanation which can be approved/rejected by Multi-unit Manager+.
// Approved excuses do not count against the manager in compliance metrics.

model ComplianceFailure {
  id             String            @id @default(cuid())
  instanceId     String            @unique
  instance       ChecklistInstance @relation(fields: [instanceId], references: [id])
  templateId     String
  template       ChecklistTemplate @relation(fields: [templateId], references: [id])
  locationId     String
  userId         String?                    // Manager responsible (RGM at that location)
  windowLabel    String?                    // "AM", "PM", etc.
  windowStart    DateTime?
  windowEnd      DateTime?
  // Explanation from manager
  explanation    String?           @db.Text  // "Store closed due to power outage"
  explainedAt    DateTime?
  explainedById  String?                    // User who provided the explanation
  // Approval by Multi-unit Manager or above
  status         String            @default("unexcused")  // unexcused, pending_review, excused, denied
  reviewedById   String?                    // Multi-unit Manager+ who reviewed
  reviewedAt     DateTime?
  reviewNotes    String?
  // When excused=true, this failure does NOT count in compliance metrics
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  @@index([locationId, createdAt])
  @@index([userId])
  @@index([status])
}

model TaskCompletion {
  id                  String            @id @default(cuid())
  instanceId          String
  instance            ChecklistInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  taskId              String
  task                ChecklistTask     @relation(fields: [taskId], references: [id])
  userId              String
  user                User              @relation(fields: [userId], references: [id])
  locationEquipmentId String?           // Which specific equipment instance was measured
  value               Json                       // { answer: true/false, temp: 41.2, text: "..." }
  isCompliant         Boolean
  photoUrls           Json              @default("[]")
  signatureUrl        String?
  notes               String?
  completedAt         DateTime          @default(now())
  correctiveAction    CorrectiveAction?
  @@index([instanceId])
}

model CorrectiveAction {
  id           String    @id @default(cuid())
  title        String
  description  String?
  priority     Priority  @default(MEDIUM)
  status       CAStatus  @default(OPEN)
  dueDate      DateTime?
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  assigneeId   String?
  assignee     User?     @relation("CAAssignee", fields: [assigneeId], references: [id])
  createdById  String
  createdBy    User      @relation("CACreator", fields: [createdById], references: [id])
  // Source linkage
  completionId    String?  @unique       // Links to TaskCompletion that triggered this CA
  completion      TaskCompletion? @relation(fields: [completionId], references: [id])
  auditResponseId String?                // Links to AuditResponse (Phase 2)
  // Value context — what was recorded vs what was expected
  actualValue  String?                   // "38 °F", "Yes"
  targetValue  String?                   // "-5 °F", "No"
  validRange   String?                   // "-10.0°F to 0.0°F", null for non-range tasks
  // Evidence & resolution
  photoUrls    Json      @default("[]")
  resolvedAt   DateTime?
  resolvedNotes String?
  comments     CAComment[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([locationId, status])
  @@index([assigneeId])
}

model CAComment {
  id                String           @id @default(cuid())
  correctiveActionId String
  correctiveAction  CorrectiveAction @relation(fields: [correctiveActionId], references: [id], onDelete: Cascade)
  userId            String
  content           String
  statusChange      String?          // "Open → Closed", null if just a comment
  createdAt         DateTime         @default(now())
  @@index([correctiveActionId])
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum CAStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  OVERDUE
}

model TemperatureLog {
  id           String   @id @default(cuid())
  locationId   String
  location     Location @relation(fields: [locationId], references: [id])
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  equipmentName String           // "Walk-in Cooler", "Prep Table"
  temperature  Float
  unit         String   @default("F")
  isCompliant  Boolean
  source       String   @default("manual")  // "manual" | "bluetooth"
  notes        String?
  recordedAt   DateTime @default(now())
  @@index([locationId, recordedAt])
}

// ── DOCUMENTS & SOPs ───────────────────────────────

model Document {
  id             String       @id @default(cuid())
  title          String
  category       String                   // "SOP", "Policy", "Training"
  content        String?      @db.Text
  fileUrl        String?
  version        Int          @default(1)
  isPublished    Boolean      @default(false)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId, category])
}

// ── MODULE 2: AUDIT MANAGEMENT (Phase 2) ───────────

model AuditTemplate {
  id             String        @id @default(cuid())
  name           String
  description    String?
  sections       Json                     // [{ name, weight, questionIds }]
  auditType      String        @default("standard")  // "standard" | "ad_hoc"
  schedule       Json?                    // Recurring schedule config
  scoringMethod  String        @default("percentage")
  geoFenceRadius Int?                     // meters, null = no geo-fence
  isActive       Boolean       @default(true)
  organizationId String
  questions      AuditQuestion[]
  instances      AuditInstance[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  @@index([organizationId])
}

model AuditQuestion {
  id           String        @id @default(cuid())
  templateId   String
  template     AuditTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  text         String
  questionType String                    // "yes_no", "text", "number", "select", "temperature", "signature"
  config       Json          @default("{}") // { choices, helpContent, weight, parentQuestionId, triggerAnswer }
  isRequired   Boolean       @default(true)
  requiresPhoto Boolean      @default(false)
  sortOrder    Int
  responses    AuditResponse[]
  @@index([templateId])
}

model AuditInstance {
  id             String        @id @default(cuid())
  templateId     String
  template       AuditTemplate @relation(fields: [templateId], references: [id])
  locationId     String
  location       Location      @relation(fields: [locationId], references: [id])
  status         String        @default("scheduled") // scheduled, in_progress, completed, validated
  score          Float?
  duration       Int?                     // seconds — tracked from start to submit
  scheduledDate  DateTime
  completedAt    DateTime?
  validatedById  String?                  // Secondary reviewer
  responses      AuditResponse[]
  createdAt      DateTime      @default(now())
  @@index([locationId, scheduledDate])
}

model AuditResponse {
  id           String        @id @default(cuid())
  instanceId   String
  instance     AuditInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  questionId   String
  question     AuditQuestion @relation(fields: [questionId], references: [id])
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  value        Json
  isCompliant  Boolean?
  photoUrls    Json          @default("[]")
  notes        String?
  respondedAt  DateTime      @default(now())
  @@index([instanceId])
}

// ── MODULE 3: FACILITIES MAINTENANCE (Phase 3) ─────
// Note: LocationEquipment model (above) replaces standalone Equipment model.
// Phase 3 populates the model/serialNumber/installDate/warrantyExpiry fields.
//
// APPROVAL WORKFLOW:
//   RGM/Store Manager submits request (status: submitted)
//   → District/Multi-unit Manager approves & assigns vendor (status: approved)
//   → Vendor performs work (status: in_progress)
//   → Submitter or manager verifies completion (status: pending_verification → completed)
//   Director of Operations and above can approve at any stage.
//   Rejected requests go back to submitter with notes.

model Vendor {
  id             String       @id @default(cuid())
  name           String
  contactName    String?
  email          String?
  phone          String?
  specialty      String?                   // "HVAC", "Plumbing", "Refrigeration", "General"
  notes          String?
  isActive       Boolean      @default(true)
  organizationId String
  workOrders     WorkOrder[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@index([organizationId])
}

model WorkOrder {
  id           String    @id @default(cuid())
  title        String
  description  String?
  priority     Priority  @default(MEDIUM)
  status       String    @default("submitted")
  // Lifecycle: submitted → approved → in_progress → pending_verification → completed
  //            submitted → rejected (back to submitter)
  //            any → canceled
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  equipmentId  String?
  equipment    LocationEquipment? @relation(fields: [equipmentId], references: [id])
  // Submitter (RGM / Store Manager)
  createdById  String
  createdBy    User      @relation("WOCreator", fields: [createdById], references: [id])
  // Approver (District Manager / Director of Ops / above)
  approvedById String?
  approvedBy   User?     @relation("WOApprover", fields: [approvedById], references: [id])
  approvedAt   DateTime?
  rejectedAt   DateTime?
  rejectionNotes String?
  // Vendor assignment (set by approver)
  vendorId     String?
  vendor       Vendor?   @relation(fields: [vendorId], references: [id])
  // Assignee — internal person tracking the work (optional, in addition to vendor)
  assigneeId   String?
  assignee     User?     @relation("WOAssignee", fields: [assigneeId], references: [id])
  // Cost tracking
  estimatedCost Float?
  actualCost    Float?
  expenseNotes  String?
  invoiceUrl    String?
  photoUrls    Json      @default("[]")
  dueDate      DateTime?
  completedAt  DateTime?
  comments     WorkOrderComment[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([locationId, status])
  @@index([vendorId])
}

model WorkOrderComment {
  id           String    @id @default(cuid())
  workOrderId  String
  workOrder    WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  userId       String
  content      String
  statusChange String?                   // "submitted → approved", null if just a comment
  createdAt    DateTime  @default(now())
  @@index([workOrderId])
}

// ── MODULE 4: GUEST SERVICE (Phase 4) ───────────────
//
// RESOLUTION WORKFLOW:
//   Complaint arrives via webhook (POS, email, social) → status: new
//   → Auto-assigned to RGM/Store Manager at that location → status: assigned
//   → Store Manager MUST provide action plan + resolution to close → status: resolved
//   → Resolution reviewed by District Manager+ (optional) → status: closed
//   Complaints cannot be closed without an action plan / resolution response.

model Complaint {
  id           String    @id @default(cuid())
  caseNumber   String    @unique @default(cuid())
  subject      String
  description  String    @db.Text
  source       String    @default("webhook") // webhook, email, phone, walk_in, social
  priority     Priority  @default(MEDIUM)
  status       String    @default("new")   // new, assigned, in_progress, resolved, closed
  isEscalated  Boolean   @default(false)
  isFyi        Boolean   @default(false)   // FYI-only cases (no resolution required)
  guestName    String?
  guestEmail   String?
  guestPhone   String?
  locationId   String
  location     Location  @relation(fields: [locationId], references: [id])
  assigneeId   String?
  assignee     User?     @relation("ComplaintAssignee", fields: [assigneeId], references: [id])
  // Resolution (required to close — Store Manager must fill these)
  actionPlan       String?   @db.Text     // What steps will be taken to address the issue
  resolution       String?   @db.Text     // What was actually done to resolve it
  resolvedById     String?                // Store Manager who resolved
  resolvedAt       DateTime?
  // Tracking
  responseDeadline DateTime?              // SLA: when the store manager must respond by
  firstResponseAt  DateTime?              // When assignee first responded
  messages     ComplaintMessage[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([locationId, status])
  @@index([assigneeId])
}

model ComplaintMessage {
  id           String    @id @default(cuid())
  complaintId  String
  complaint    Complaint @relation(fields: [complaintId], references: [id], onDelete: Cascade)
  direction    String                    // "inbound" | "outbound" | "internal"
  channel      String                    // "webhook" | "email" | "phone" | "note"
  content      String    @db.Text
  sentById     String?
  createdAt    DateTime  @default(now())
}

// ── SAAS PLATFORM LAYER ────────────────────────────
// Pattern from manage-cater-saas. These models support
// the SaaS admin portal, not the tenant application.

model Plan {
  id                 String         @id @default(cuid())
  name               String                    // "Starter", "Professional", "Enterprise"
  slug               String         @unique
  stripePriceMonthly String?
  stripePriceAnnual  String?
  priceMonthly       Float
  priceAnnual        Float
  features           Json                      // { modules: ["checklists","audits"], maxLocations: 5, maxUsers: 20 }
  limits             Json                      // { locations: 5, users: 20, apiKeysPerOrg: 3 }
  isPopular          Boolean        @default(false)
  sortOrder          Int            @default(0)
  isActive           Boolean        @default(true)
  subscriptions      Subscription[]
  createdAt          DateTime       @default(now())
}

model Subscription {
  id                   String             @id @default(cuid())
  organizationId       String             @unique
  planId               String
  plan                 Plan               @relation(fields: [planId], references: [id])
  stripeSubscriptionId String?            @unique
  stripeCustomerId     String?
  status               SubscriptionStatus @default(TRIALING)
  billingInterval      String             @default("monthly")  // "monthly" | "annual"
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  trialEndsAt          DateTime?
  canceledAt           DateTime?
  suspendedAt          DateTime?
  provisionedManually  Boolean            @default(false)
  provisionedById      String?            // SaaS admin who provisioned
  payments             Payment[]
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  SUSPENDED
  CANCELED
  PAUSED
}

model Payment {
  id              String       @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  stripeInvoiceId String?      @unique
  amount          Float
  currency        String       @default("usd")
  status          String       @default("pending")  // succeeded, failed, refunded, pending
  paidAt          DateTime?
  createdAt       DateTime     @default(now())
}

model DiscountCode {
  id            String    @id @default(cuid())
  code          String    @unique
  percentOff    Int
  type          String                   // "lifetime" | "first_year"
  billingScope  String    @default("both")  // "both" | "monthly" | "annual"
  startsAt      DateTime
  expiresAt     DateTime?
  isActive      Boolean   @default(true)
  maxUses       Int?
  currentUses   Int       @default(0)
  createdAt     DateTime  @default(now())
}

// ── WEBHOOKS & API KEYS ────────────────────────────

model WebhookEndpoint {
  id             String       @id @default(cuid())
  organizationId String
  channel        String                    // "complaints", "sales", "generic"
  secret         String                    // HMAC secret for signature verification
  isActive       Boolean      @default(true)
  lastReceivedAt DateTime?
  createdAt      DateTime     @default(now())
  events         WebhookEvent[]
  @@unique([organizationId, channel])
  @@index([organizationId])
}

model WebhookEvent {
  id             String           @id @default(cuid())
  endpointId     String?
  endpoint       WebhookEndpoint? @relation(fields: [endpointId], references: [id])
  source         String                    // "pos", "stripe", "email", "social"
  eventType      String                    // "complaint.created", "sale.completed"
  externalId     String?                   // Dedupe key from source system
  payload        Json                      // Raw webhook payload
  processed      Boolean          @default(false)
  error          String?          @db.Text
  createdAt      DateTime         @default(now())
  @@index([endpointId])
  @@index([source, eventType])
}

model ApiKey {
  id             String       @id @default(cuid())
  organizationId String
  name           String                    // "POS Integration", "BI Dashboard"
  keyHash        String       @unique      // SHA-256 hash of the actual key (key shown once on create)
  keyPrefix      String                    // First 8 chars for identification: "wtf_live_abc12345..."
  scopes         Json                      // ["checklists.read", "reports.read", "temperature.read"]
  locationIds    Json         @default("[]")  // Empty = all locations, otherwise restrict
  rateLimit      Int          @default(1000)  // Requests per hour
  lastUsedAt     DateTime?
  expiresAt      DateTime?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  @@index([organizationId])
  @@index([keyHash])
}

// SalesData stores daily summary totals per location (not individual transactions).
// Pattern from Hisab project. Shows previous year same period + % change.
model SalesData {
  id               String   @id @default(cuid())
  organizationId   String
  locationId       String
  date             DateTime @db.Date          // Summary date
  totalAmount      Float                      // Daily total revenue
  transactionCount Int      @default(0)       // Number of transactions
  checkAverage     Float?                     // Average check amount (totalAmount / transactionCount)
  channelSplit     Json     @default("{}")    // { "dine_in": 1200.50, "drive_thru": 3400.00, "delivery": 800.00 }
  previousYearAmount Float?                   // Same date last year (for YoY comparison)
  previousYearCount  Int?                     // Transaction count same date last year
  metadata         Json     @default("{}")    // Flexible POS-specific data
  webhookEventId   String?                    // Which webhook event created this
  createdAt        DateTime @default(now())
  @@unique([organizationId, locationId, date])
  @@index([organizationId, locationId, date])
}

// ── SUPPORT & KNOWLEDGE BASE ───────────────────────

model SupportTicket {
  id               String    @id @default(cuid())
  organizationId   String
  userId           String                   // User who created the ticket
  subject          String
  category         String    @default("other")  // bug, question, feature_request, billing, other
  status           String    @default("open")   // open, in_progress, resolved, closed
  priority         String    @default("medium") // low, medium, high, urgent
  lastViewedByAdmin DateTime?
  lastViewedByUser  DateTime?
  messages         SupportTicketMessage[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  @@index([organizationId])
  @@index([status])
}

model SupportTicketMessage {
  id        String        @id @default(cuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  senderId  String
  body      String        @db.Text
  isStaff   Boolean       @default(false)
  createdAt DateTime      @default(now())
  @@index([ticketId])
}

model KnowledgeBaseArticle {
  id           String   @id @default(cuid())
  title        String
  slug         String   @unique
  summary      String
  body         String   @db.Text
  category     String                    // "getting-started", "checklists", "audits", "billing"
  tags         Json     @default("[]")   // ["temperature", "equipment", "compliance"]
  sortOrder    Int      @default(0)
  isPublished  Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([category])
}

// ── AUDIT & SYSTEM ─────────────────────────────────

model AuditLog {
  id           String   @id @default(cuid())
  action       String                    // "suspend_account", "provision_org", "change_plan"
  targetOrgId  String?
  targetUserId String?
  adminId      String                    // SaaS admin who performed the action
  metadata     Json     @default("{}")
  ipAddress    String?
  createdAt    DateTime @default(now())
  @@index([adminId])
  @@index([targetOrgId])
}

model SystemSettings {
  id                String   @id @default("system")
  disableLogin      Boolean  @default(false)     // Maintenance mode
  whitelistedDomains Json    @default("[]")      // Domains that bypass maintenance
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ── SAAS ADMIN USERS (separate from tenant User table) ──

model SaasAdmin {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String
  name           String
  role           String   @default("ADMIN")  // "ADMIN" | "SUPER_ADMIN"
  isActive       Boolean  @default(true)
  lastLoginAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// ── BRAND TEMPLATE LIBRARY ─────────────────────────
// Master brand templates curated by SaaS admins (e.g., "Dunkin Standard").
// SaaS admin can copy templates from the master library or from any org
// into a new org during provisioning.

model BrandTemplate {
  id             String   @id @default(cuid())
  brandName      String                    // "Dunkin", "Subway", "Generic QSR"
  name           String                    // "Dunkin Standard Book Logs"
  description    String?
  category       String?                   // "Book Logs", "Food Safety", etc.
  templateData   Json                      // Full template + tasks snapshot for cloning
  isActive       Boolean  @default(true)
  createdById    String?                   // SaaS admin who created it
  sourceOrgId    String?                   // If copied from an existing org
  sourceTemplateId String?                 // Original ChecklistTemplate ID if cloned
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([brandName])
}
```

---

## Authentication & Authorization

### Auth Setup (follows Cater.app split-config pattern)

**`lib/auth.config.ts`** — Shared config with path-based authorization:
- `/saas-admin/*` routes require ADMIN or SUPER_ADMIN role
- `/admin/*` routes require `admin.*` permissions (tenant admin)
- `/checklists/templates/*` requires `checklists.manage`
- `/checklists/*` requires `checklists.view`
- All `(dashboard)` routes require authenticated session

**`lib/auth.ts`** — Three credential providers:
1. **Email/Password** — for tenant managers/admins (full accounts). Authenticates against `User` table.
2. **PIN + Device Token** — for frontline staff on registered devices. PIN scoped to organization. Device identity via URL parameter: `/pin-login?device=abc123`. Device token from `RegisteredDevice` table identifies the location. Tenant admins/franchisees can revoke all device sessions for a terminated user (clear their PIN, deactivate their account).
3. **SaaS Admin Credentials** — separate credential provider for SaaS admin login. Authenticates against `SaasAdmin` table (not User). Route: `/saas-login`.

**JWT payload** (tenant): `{ id, name, title, role, permissions[], organizationId, homeLocationId, locationIds[], appAccess[] }`
**JWT payload** (SaaS admin): `{ saasAdminId, name, saasRole: "ADMIN" | "SUPER_ADMIN" }`

### Three Auth Layers

| Layer | Who | How | Route Guard |
|---|---|---|---|
| **SaaS Admin** | WalkTheFloor staff | Separate credential provider against `SaasAdmin` table, `saasRole: ADMIN\|SUPER_ADMIN` | `/saas-admin/*` |
| **Tenant User** | Restaurant org members | Email/password (User table) or PIN + device token | `/dashboard/*`, `/admin/*` |
| **API Key** | External systems (set up by SaaS admin, invisible to tenant) | `Authorization: Bearer wtf_live_...` header | `/api/v1/*` (read-only scoped) |

### Permission Model

**Tenant permissions** — flat string-based, stored as JSON array on Role:
```
checklists.view, checklists.complete, checklists.manage, checklists.reports
audits.view, audits.conduct, audits.manage, audits.reports
maintenance.view, maintenance.submit, maintenance.approve, maintenance.manage, maintenance.reports
guest_service.view, guest_service.manage, guest_service.reports
admin.users, admin.locations, admin.roles, admin.devices, admin.org, admin.equipment
documents.view, documents.manage
```

**App Access** (separate from permissions — controls which modules appear in navigation):
`["checklists", "audits", "maintenance", "guest_service", "admin", "documents", "reports", "support"]`

**API Key scopes** (for external integrations):
`["checklists.read", "completions.read", "corrective-actions.read", "temperature.read", "reports.read", "compliance.read", "sales.read"]`

**Built-in tenant roles** (seeded per org via /api/setup):
- **Franchisee** — all permissions, all app access
- **Director of Operations** — all module permissions including `maintenance.approve`, admin except org settings
- **Multi-unit Manager** — all module permissions including `maintenance.approve` for assigned locations, user management
- **Restaurant General Manager** — complete checklists, view/manage CAs, `maintenance.submit` (submit requests, cannot approve), view reports
- **Team Member** — complete checklists only

**SaaS admin roles** (seeded in `SaasAdmin` table):
- **SUPER_ADMIN** — full platform access, system settings, can create other admins
- **ADMIN** — org management, subscriptions, support tickets, knowledge base

**Location scoping** — inherited from direct reports + explicit overrides:
- Multi-unit Manager sees all locations of their direct reports (RGMs) automatically, plus any locations explicitly assigned via `UserLocation`
- Director of Operations sees locations of all their district managers' reports
- Franchisee sees all locations in the organization
- RGM sees their home location + explicitly assigned locations

---

## UI Architecture

### App Shell (`components/layout/app-shell.tsx`)

**Mobile (< 768px)**:
- Top bar: App logo + location name + user avatar
- Content area: full-width, card-based layouts
- Bottom navigation: 4 tabs (Checklists, Audits, Maintenance, Guest Service) — modules unlock as built, filtered by appAccess
- 44px minimum touch targets everywhere

**Desktop (>= 768px)**:
- Collapsible left sidebar: module navigation with sub-items (mirrors WorkPulse pattern)
- Top bar: location selector dropdown + search + notifications bell + user menu with greeting
- Content area: tables, dashboards, multi-column layouts

### Notifications
Three channels:
- **In-app bell** — all notification types, unread badge count in top bar
- **Email (Resend)** — critical items: CA generated, complaint assigned, compliance failures, password reset, support replies, compliance alerts
- **SMS (Twilio)** — critical compliance failures only. Triggers: missed checklist (sent to RGM), critical CA generated, complaint SLA expiring. Reference stocktrack project for Twilio integration pattern.

**Resend handles ALL outbound email**: notifications, password reset, support replies, compliance alerts.
**Resend inbound webhook** for receiving email complaints: inbound emails → `/api/resend/inbound/route.ts` → transforms Resend's inbound payload → forwards to webhook pipeline → creates Complaint record.

### Home Dashboard (role-based, `app/(dashboard)/page.tsx`)

The landing page after login. Shows real-time operational metrics with **roll-up visibility** — higher roles see aggregate data across their locations.

**Team Member / RGM (Store Manager)** — single-location view:
- **Today's Checklists**: cards per checklist (Book Logs AM ✓, Book Logs PM pending, Opening ✓, Closing pending, Food Safety due in 12 days) with progress bars, compliance window countdown ("Due by 11:00 AM")
- **My Compliance Failures**: unexcused count, pending review count, link to provide explanation for any missed checklist
- **Open CAs**: count + list of items needing attention
- **Guest Complaints**: assigned to me, requiring action plan / resolution
- **Maintenance Requests**: my submitted requests + status
- **Today's Sales** (if webhook data available): revenue, transaction count, check average, previous year same period + % change

**Multi-unit Manager (District Manager)** — multi-location roll-up:
- **Compliance Overview**: checklist completion % per location (today, this week, this month)
- **Failures to Comply**: # of unexcused failures by store and by user, pending excuse reviews requiring approval
- **Overdue Items**: locations with missed checklists, overdue CAs, unresolved complaints
- **Checklist Adherence**: which locations completed Book Logs (2x/day), Opening, Closing, monthly Food Safety on schedule
- **Maintenance Approvals**: pending requests requiring approval + vendor assignment
- **Guest Complaints**: open complaints across locations, SLA countdown
- **Sales Snapshot**: revenue by location (today, week, month trend), transaction count, check average, YoY comparison + % change

**Director of Operations** — all locations under their reports:
- Everything Multi-unit Manager sees, aggregated across all their district managers
- **Trend Charts**: compliance %, CA close rate, complaint resolution time over weeks/months
- **Location Scorecard**: ranked table of locations by composite score (compliance + CAs + complaints + sales)
- **Maintenance Pipeline**: all pending approvals, approved work orders, cost tracking

**Franchisee** — full org view:
- Everything Director sees, across entire organization
- **Financial Summary**: total sales, maintenance costs, complaint volume
- **KPI Cards**: overall compliance %, open CAs, avg complaint resolution time, monthly maintenance spend

### Checklist Frequency & Adherence Tracking

Built-in checklist types with enforced completion schedules:

| Checklist | Frequency | Instances/Day | Compliance Window |
|---|---|---|---|
| Book Logs (temp readings) | Every 12h | 2 (AM + PM) | AM: 05:00–11:00, PM: 14:00–20:00 — **MISSED if not done in window** |
| Opening Checklist | Daily 1x | 1 | 05:00–08:00 |
| Closing Checklist | Daily 1x | 1 | 20:00–23:00 |
| Food Safety Assessment | Monthly | 1 | Entire day on configured day of month |
| Custom — every 4h | Every 4h | 6 | 6 windows of 4 hours each |
| Custom — every 8h | Every 8h | 3 | 3 windows of 8 hours each |
| Custom — specific days | Weekly (pick days) | Per config | e.g., Mon + Wed only, window per day |
| Custom — other | Daily/weekly/monthly/N-day interval | Per config | Window set at creation |

**Adherence tracking** — every instance has a compliance window (`windowStart` → `windowEnd`). The cron job checks windows and enforces compliance:
- Completed within window → ✓ compliant
- Completed after window closes → ⚠ late (`COMPLETED_LATE`)
- Window closes with no completion → ✗ missed (`MISSED`), `ComplianceFailure` record created automatically
- Every-4h checklists: 6 windows/day, each must be completed independently
- Every-8h/12h: 3 or 2 windows/day
- Weekly (Mon+Wed): only generates instances on selected days
- Monthly: one window on the configured day

**Compliance windows** — each checklist instance has a `windowStart` and `windowEnd`:
- Completed within window → compliant (✓)
- Completed after window → late (⚠), `COMPLETED_LATE` status
- Never completed → missed (✗), `MISSED` status, `ComplianceFailure` record auto-created

**Failure-to-comply workflow**:
1. Window closes → cron marks instance MISSED → creates `ComplianceFailure` (status: `unexcused`)
2. RGM/Store Manager sees their failures and can **provide an explanation** (e.g., "Store closed due to power outage") → status: `pending_review`
3. Multi-unit Manager or above **reviews and approves/denies** the excuse → status: `excused` or `denied`
4. **Excused failures do NOT count** against the manager in compliance metrics
5. Unexcused and denied failures count against the manager

**Visibility** — Multi-unit Manager, Director of Ops, and Franchisee see:
- **Checklist Adherence grid**: rows = locations, columns = checklist types, cells = completion status (✓ done, ⚠ late, ✗ missed)
- **Failure-to-comply summary**: # of failures by store and by user (with excused/unexcused breakdown)
- **Pending excuses**: queue of explanations awaiting review (Multi-unit Manager+ can approve/deny)
- Filterable by date range, location, checklist type, user
- Drill-down to see who completed, when, any non-compliant items, and excuse history

### Key Mobile Screens (Phase 1)

1. **Home Dashboard** — role-appropriate metrics (see above), tap any card to drill into detail
2. **Today's Checklists** — cards showing each checklist with progress bar, shift badge, status, frequency indicator (e.g., "1 of 2 today")
3. **Checklist Execution** — scrollable task list with per-task auto-save (the critical screen)
   - Sticky header with checklist name + progress bar (updates real-time)
   - Each task: title, equipment name (if applicable), input field by type, photo button, notes toggle
   - **Auto-save**: each task completion is POSTed immediately on entry. No "Submit" button.
   - Instance status moves to IN_PROGRESS on first task save
   - Checklist auto-completes when all required tasks are done
   - Non-compliant entries highlighted immediately with CA auto-creation
4. **Corrective Actions** — card-based list (source task, location, value vs target, status, assignee)
   - Detail panel on click: comments, status change history, Add Comment + Share
5. **Temperature Logs** — recent readings with compliance color coding

### Key Desktop Screens (Phase 1)

1. **Home Dashboard** — role-based metrics dashboard (see above), responsive grid of KPI cards + charts
2. **Book Dashboard** — Radial completion chart, KPI cards (Open/Overdue/Completed/All), category carousel, completion summary (by category / by task toggle), last 7 days progress bar
3. **Task Dashboard** — Compliance grid: rows = equipment grouped by category, columns = dates, cells = readings color-coded by compliance. Category filter tabs with % scores. Date range navigation. Show Initials toggle.
4. **Checklist Adherence** (Multi-unit Manager+) — Location × checklist type grid showing completion status with drill-down. Failures-to-comply summary by store and user with excused/unexcused breakdown. Pending excuse review queue.
5. **Task Compliance** — Shift-level compliance by category with granularity filter
6. **Task Progress** — Weekly completion % table by region/user
7. **Daily Tasks** — Printable view per location/date/category with Compact mode toggle
8. **CA Reports** — CA % closed heatmap by category (Days/Weeks/Months/Quarters), color-coded ranges (red/orange/yellow/green)
9. **Template Builder** — drag-and-drop task list, per-task config panel (type, range, target, schedule time), equipment type linkage, **frequency selector** (daily/2x daily/weekly/monthly/custom interval)
10. **Admin — Users** — Data table with initials avatar, name, confirmed badge, title, manager, home location, assigned locations count. Detail modal with 4 sections (User Details, Title/Roles, Location Access, App Settings). Import/Export, View Hierarchy.
11. **Admin — Locations** — Left list + right detail with tabs (Location, Book, Audit). Book tab: equipment config table (type, quantity, tasks, add/remove), non-equipment tasks, task ordering, clone button.
12. **Admin — Equipment Types** — Org-level equipment type catalog CRUD
13. **Admin — Shifts** — AM/PM/Overnight definitions with start/end times

---

## API Architecture

### Route Pattern (follows Cater.app style)

Every API route:
1. Extract & verify auth via `withAuth()` wrapper
2. Check permission via `requirePermission()`
3. Scope all queries to `session.organizationId` (multi-tenancy enforcement)
4. Filter by `session.locationIds` for location-scoped users
5. Validate input with Zod
6. Call service layer function
7. Return consistent envelope: `{ data }` or `{ error, message }`

```typescript
// lib/api-utils.ts
export function withAuth(handler, requiredPermission?) {
  return async (req, context) => {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (requiredPermission && !hasPermission(session.user.permissions, requiredPermission)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, context, session);
  }
}
```

### Cron Endpoints

- **`/api/cron/generate-checklists`** — Single cron job, handles all timezones in code. Converts window times to UTC per `location.timezone`. Respects `LocationTemplateConfig.windowOverrides` per location when present. Creates ChecklistInstance records from active templates + schedule config. Handles all frequencies: daily templates get 1 or 2 instances (per `timesPerDay`), weekly templates only on scheduled days, monthly templates only on `dayOfMonth`, custom interval templates based on last completion date. Generates instances per template × location × shift/time.
- **`/api/cron/flag-overdue`** — Runs every 15 minutes. Checks all open instances whose `windowEnd` (UTC) has passed — marks as MISSED, creates `ComplianceFailure` records (status: `unexcused`). Also flags CAs past due date as OVERDUE. Sends SMS (Twilio) for missed checklists to RGM and critical CAs.

Triggered via Dokploy cron or external cron service (curl POST with API key).

---

## Dockerfile (Adapted from Cater.app for PostgreSQL)

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG AUTH_SECRET
ENV AUTH_SECRET=$AUTH_SECRET
ARG NEXTAUTH_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV AUTH_TRUST_HOST=true
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

No SQLite volume needed — PostgreSQL is external. `/api/setup` runs `prisma migrate deploy` + seed.

---

## Phase 1 Implementation Plan: Checklists & Food Safety

### Step 1: Project Bootstrap
- `npx create-next-app@latest` with TypeScript, Tailwind v4, App Router
- Install all dependencies (see tech stack table)
- `next.config.ts` with `output: "standalone"`
- Prisma init with PostgreSQL provider
- `.env.example` with DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
- Dockerfile + `.dockerignore`

### Step 2: Database Schema & Setup
- Write full `prisma/schema.prisma` (all models above — schema all 4 modules now, build Phase 1)
- Use **Prisma Migrate**: `prisma migrate dev` locally, `prisma migrate deploy` in Docker
- Create `/api/setup/route.ts` — runs `prisma migrate deploy` + seed (no raw SQL)
- Create `/api/health/route.ts`
- Create `prisma/seed.ts` — seeds: default org, admin user (Franchisee role), built-in roles (all 5 levels), 3 default shifts (AM/PM/Overnight), sample equipment types (Walkin Freezer, Walkin Cooler, Dairy Dispenser, Hot Holding Unit, Sandwich Station, Thermometer), sample locations (2-3), **built-in checklist templates** (Book Logs 2x/day, Opening Checklist daily, Closing Checklist daily, Food Safety Assessment monthly), initial SaasAdmin user

### Step 3: Authentication
- `lib/auth.config.ts` + `lib/auth.ts` (split pattern from Cater.app)
- **Three credential providers**:
  1. Email/Password — authenticates against `User` table (tenant users)
  2. PIN + Device Token — frontline staff, device identity via URL parameter `/pin-login?device=abc123`
  3. SaaS Admin Credentials — authenticates against `SaasAdmin` table (separate from User)
- JWT callbacks: tenant payload includes permissions + appAccess + title; SaaS admin payload includes saasAdminId + saasRole
- `app/(auth)/login/page.tsx` — tenant email/password form
- `app/(auth)/saas-login/page.tsx` — SaaS admin login form
- `app/(auth)/pin-login/page.tsx` — PIN entry with device context (URL: `/pin-login?device=abc123`)
- Tenant admins/franchisees can revoke all device sessions for a terminated user (clear PIN, deactivate account)
- `lib/permissions.ts` — constants + `hasPermission()` helper
- `lib/api-utils.ts` — `withAuth()` wrapper

### Step 4: App Shell & Design System
- `globals.css` — Tailwind v4 theme: colors, spacing, typography
- Install shadcn components: Button, Card, Input, Dialog, DropdownMenu, Tabs, Badge, Table, Select, Popover, Calendar, Sheet
- `components/layout/app-shell.tsx` — responsive shell
- `components/layout/sidebar.tsx` — desktop nav with collapsible sub-items (checklists sub-nav)
- `components/layout/bottom-nav.tsx` — mobile nav (filtered by appAccess)
- `components/layout/top-bar.tsx` — header with location selector + greeting
- `components/data/status-badge.tsx`, `compliance-bar.tsx`, `components/dashboard/stats-card.tsx`

### Step 5: Equipment & Shift Setup (Admin Foundation)
- `app/(dashboard)/admin/equipment/page.tsx` — equipment type catalog CRUD
- `app/(dashboard)/admin/shifts/page.tsx` — shift definitions (AM/PM/Overnight)
- `lib/services/equipment-service.ts` — equipment type CRUD, per-location equipment assignment
- API routes: `app/api/v1/equipment-types/`, `app/api/v1/shifts/`

### Step 6: Location Management with Book Config
- `app/(dashboard)/admin/locations/page.tsx` — location list (left panel) + detail (right panel with tabs)
- `app/(dashboard)/admin/locations/[locationId]/book/page.tsx` — per-location equipment assignment
  - Equipment tab: assign equipment types, set quantities, name instances, manage tasks per equipment
  - Non-Equipment tab: assign non-equipment checklist tasks
  - Task Ordering tab: drag-and-drop sort order
  - Clone button: copy everything from another location (equipment + tasks + ordering). Per-location compliance window overrides via `LocationTemplateConfig.windowOverrides`
- `components/forms/equipment-config.tsx` — equipment assignment table
- API routes: `app/api/v1/equipment/`, `app/api/v1/locations/`

### Step 7: Checklist Template Builder (Admin)
- `app/(dashboard)/checklists/templates/page.tsx` — list templates, DataTable
- `app/(dashboard)/checklists/templates/new/page.tsx` — create form
- `app/(dashboard)/checklists/templates/[templateId]/page.tsx` — edit form
- `components/forms/checklist-builder.tsx` — add/reorder tasks, configure task type + range/target, link to equipment type, set scheduled time, schedule settings
- `lib/validators/checklist.ts` — Zod schemas for template CRUD
- `lib/services/checklist-service.ts` — template CRUD operations
- API routes: `app/api/v1/checklists/` — GET (list), POST (create), PATCH, DELETE

### Step 8: Checklist Execution (Field Workers — THE KEY SCREEN)
- `app/(dashboard)/checklists/page.tsx` — Book Dashboard: radial chart, KPI cards, category carousel
- `app/(dashboard)/checklists/[instanceId]/page.tsx` — execute checklist
  - **Auto-save**: each task completion is POSTed immediately (no "Submit" button)
  - Instance status moves to IN_PROGRESS on first task save
  - Progress bar updates real-time as tasks are completed
  - Checklist auto-completes when all required tasks are done
- `components/forms/task-field-renderer.tsx` — renders input by TaskType, shows equipment name + target range
- `components/forms/image-upload.tsx` — camera/file upload with client-side resize (1200px max dimension, 80% JPEG quality via browser canvas). Upload via presigned URLs to S3-compatible storage (Cloudflare R2).
- `components/forms/signature-pad.tsx` — touch signature canvas
- `lib/services/instance-service.ts` — instance queries, completion logic
- `lib/services/storage-service.ts` — presigned URL generation for R2 uploads
- API routes: `app/api/v1/instances/` — GET today's instances, `app/api/v1/completions/` — POST individual task completion
- Auto-create CorrectiveAction on non-compliant completion (with actualValue, targetValue, validRange populated)
- If org setting `retakeReadingOnCA` is true, prompt user to re-take reading

### Step 9: Corrective Actions
- `app/(dashboard)/checklists/corrective-actions/page.tsx` — card-based CA list with detail panel
  - Each card: source task, location, question type, value vs target range, equipment name, due date, status, assignee with initials
  - Detail panel: expanded info, comments with status change trail, Add Comment + Share
  - Filters: All/My tabs, search by assignee/title/location, sort, export to Excel/PDF
- **Auto-assignment**: CA auto-assigned to the RGM (homeUser) at that location. If no RGM found, leave unassigned and notify Multi-unit Manager.
- `lib/services/corrective-action-service.ts` — CRUD + status transitions + comment management + auto-assignment logic
- API routes: `app/api/v1/corrective-actions/` — CRUD + status transitions + comments

### Step 10: Temperature Monitoring & Compliance Views
- `app/(dashboard)/checklists/temperature/page.tsx` — log list + compliance chart
- `app/(dashboard)/checklists/tasks/page.tsx` — Task Dashboard: compliance grid (date × equipment grouped by category), color-coded cells, category tabs with % scores
- `app/(dashboard)/checklists/compliance/page.tsx` — shift-level compliance by category
- `app/(dashboard)/checklists/progress/page.tsx` — weekly completion % by user
- `app/(dashboard)/checklists/daily/page.tsx` — printable daily tasks (location + date + category filters, compact mode)
- `components/data/compliance-grid.tsx` — the core grid component
- `lib/services/compliance-service.ts` — aggregation queries for all compliance views
- `lib/services/temperature-service.ts`
- API routes: `app/api/v1/temperature-logs/`, `app/api/v1/reports/`

### Step 11: Dashboard & Reports
- `app/(dashboard)/page.tsx` — **role-based home dashboard** (see UI Architecture for full breakdown):
  - **Team Member / RGM**: today's checklists (with frequency — "1 of 2"), open CAs, my complaints, my maintenance requests, today's sales (total + transaction count + check average, with previous year comparison + % change)
  - **Multi-unit Manager**: compliance % per location, overdue items, checklist adherence grid, maintenance approvals, complaints across locations, sales by location (with YoY comparison)
  - **Director of Ops**: roll-up across all district managers, trend charts, location scorecard, maintenance pipeline
  - **Franchisee**: full org view, financial summary (sales + maintenance costs + complaint volume), overall KPIs
- `app/(dashboard)/checklists/adherence/page.tsx` — **Checklist Adherence view** (Multi-unit Manager+): location × checklist type grid with ✓/⚠/✗ status, failure-to-comply counts by store and user (excused vs unexcused), drill-down
- `app/(dashboard)/checklists/failures/page.tsx` — **Compliance Failures**:
  - RGM view: my missed checklists, provide explanation for each, see review status
  - Multi-unit Manager+ view: pending excuse review queue (approve/deny), failure summary across stores and users
- `app/(dashboard)/checklists/reports/page.tsx` — CA % closed heatmap by category (Days/Weeks/Months/Quarters range), color-coded ranges, export
- `components/dashboard/category-carousel.tsx`, `score-ring.tsx`, `adherence-grid.tsx`, `location-scorecard.tsx`
- `lib/services/dashboard-service.ts` — aggregation queries scoped by user role + assigned locations

### Step 12: User Management & Admin
- `app/(dashboard)/admin/users/page.tsx` — user list with initials avatar, title, manager, home location, assigned locations count
  - Detail modal: 4 sections (User Details, Title/Roles, Location Access, App Settings)
  - Actions: Add User, Reset Password, Assign Location, Import/Export
  - View Hierarchy toggle
- `app/(dashboard)/admin/organization/page.tsx` — org profile + app settings (tabbed: General, Book)
  - Book tab: task expiry minutes, daily summary emails, critical tasks, CA settings, default dashboard categories
- `app/(dashboard)/admin/roles/page.tsx` — role & permission editor
- `app/(dashboard)/admin/devices/page.tsx` — MDR device registration grid (Device ID, Location, Make, OS, Registration Date, Last Active)
- `app/(dashboard)/documents/page.tsx` — SOP upload/management
- `lib/services/user-service.ts`, `document-service.ts`

### Step 13: SaaS Admin Portal
Pattern from `manage-cater-saas`:
- `app/(saas-admin)/layout.tsx` — separate admin layout with SaaS nav
- **Organizations**: list all orgs with subscription status, user count, location count. Provision new orgs (create org + admin user + trial subscription). Suspend/reactivate/cancel.
- **Per-org Integrations** (`/saas-admin/organizations/{orgId}/integrations`):
  - **Webhook endpoints**: configure inbound channels (complaints, sales, generic) with HMAC secrets. Test webhook button. View event log.
  - **API keys**: generate keys scoped to this org, configure module + location access, set rate limits. Key shown once on creation, stored as SHA-256 hash. Prefix: `wtf_live_` + 32 random chars.
  - Tenants never see this page — it's purely SaaS admin territory
- **Template Library**: master brand template library (SaaS admin curated, e.g., "Dunkin Standard", "Subway Standard") via `BrandTemplate` model. SaaS admin can:
  - Create/manage brand templates from scratch
  - Copy templates from any existing org into the master library
  - Copy templates from the master library into a new org during provisioning
  - Copy templates from one org to another
- **Subscriptions**: plan assignment, Stripe sync, extend trial, manual provisioning
- **Plans**: tier configuration with feature flags and limits (max locations, max users, modules included)
- **Discounts**: create/manage discount codes
- **Global Webhook Log**: all webhook events across orgs with filtering
- **Audit Log**: all admin actions with timestamps, target org/user, IP address
- **System Settings**: maintenance mode, whitelisted domains
- `lib/saas/admin-actions.ts` — all SaaS admin functions (suspend, reactivate, provision, extend trial, template cloning, etc.)
- `lib/saas/subscription-service.ts` — Stripe checkout, portal, plan changes

### Step 14: Inbound Webhooks & API Key Auth
- `app/api/webhooks/[orgSlug]/[channel]/route.ts` — universal webhook receiver
  - Channels: `complaints` (creates Complaint records), `sales` (creates SalesData records), `generic` (logs for custom processing)
  - **Standard webhook schema** — POS vendors conform to our published format. Required fields:
    - Complaints: `{ externalId, source, subject, description, guestName?, guestEmail?, guestPhone?, locationStoreNumber, priority?, metadata? }`
    - Sales: `{ externalId?, date, totalAmount, transactionCount, checkAverage?, channelSplit?: { dine_in, drive_thru, delivery }, locationStoreNumber }`
  - Signature verification (HMAC with per-endpoint secret configured by SaaS admin)
  - All events logged to `WebhookEvent` table before processing
  - Idempotency via `externalId` dedupe
- `app/api/resend/inbound/route.ts` — Resend inbound webhook receiver. Transforms Resend's inbound email payload and forwards to the webhook pipeline to create Complaint records.
- `lib/services/webhook-service.ts` — event routing, payload parsing, record creation
- `lib/services/api-key-service.ts` — key generation, hash validation, scope checking, rate limiting
- Middleware: `/api/v1/*` routes accept both session auth AND `Authorization: Bearer` API key auth
- Scoped read-only access: checklists, completions, CAs, temperature logs, compliance reports, sales data
- API routes: `app/api/saas-admin/organizations/[orgId]/api-keys/` and `.../webhooks/` — CRUD for SaaS admin only

### Step 15: Stripe Integration & Subscription Flow
**Two paths**:
1. **Self-serve** — smaller customers: `/pricing` page → `/signup` → Stripe Checkout → org auto-provisioned
2. **Sales-led** — enterprise customers: SaaS admin manually provisions org, assigns plan, optionally sets up Stripe or invoices externally

No public landing page in this app (separate marketing site). But include `/pricing` and `/signup` pages for the self-serve path.

- `lib/stripe.ts` — Stripe client singleton
- `app/(auth)/pricing/page.tsx` — plan comparison page
- `app/(auth)/signup/page.tsx` — self-serve signup form → creates org + admin user + redirects to Stripe Checkout
- `app/api/stripe/checkout/route.ts` — create checkout session for new subscriptions
- `app/api/stripe/portal/route.ts` — customer billing portal redirect
- `app/api/stripe/webhook/route.ts` — Stripe webhook receiver
  - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`
  - All events logged to `WebhookEvent` (source: "stripe")
  - Updates Subscription status in DB

### Step 16: Support Tickets & Knowledge Base
- **Customer side**:
  - `app/(dashboard)/support/page.tsx` — my tickets list + create ticket form (subject, category, body)
  - Reply to tickets, close tickets, unread count in nav
  - `app/(dashboard)/help/page.tsx` — searchable knowledge base articles (from DB)
- **SaaS admin side**:
  - `app/(saas-admin)/saas-admin/support/page.tsx` — all tickets across orgs, filter by status/priority
  - `app/(saas-admin)/saas-admin/support/[ticketId]/page.tsx` — ticket detail, admin reply (sends email via Resend)
  - `app/(saas-admin)/saas-admin/knowledge-base/page.tsx` — article CRUD (title, slug, summary, body, category, tags)
- `lib/saas/support-service.ts` — ticket lifecycle, admin replies, unread tracking
- `lib/saas/knowledge-base-service.ts` — article CRUD, search

### Step 17: PWA Setup
- `app/manifest.ts` — dynamic Web App Manifest
- Service worker via Serwist — cache app shell + API responses (StaleWhileRevalidate)
- Offline indicator in top bar
- **Basic offline queue**: task completions save to localStorage when offline, sync automatically when back online. Conflict resolution: last-write-wins with timestamp comparison.

### Step 18: Cron Jobs & Polish
- **Single cron job** per endpoint — handles all timezones in code. Convert compliance window times to UTC per `location.timezone`. No per-timezone cron scheduling needed.
- `/api/cron/generate-checklists/route.ts` — creates instances per frequency (daily 1x/2x, weekly, monthly, custom interval) × locations × shifts. Window start/end stored as UTC after converting from location timezone. Respects `LocationTemplateConfig.windowOverrides` when present.
- `/api/cron/flag-overdue/route.ts` — marks MISSED instances + OVERDUE CAs. Compares current UTC time against UTC window end times.
- Loading states, error boundaries, empty states ("No ticket available" style)
- Mobile polish: pull-to-refresh feel, smooth transitions

---

## Future Phases (Architecture Ready)

### Phase 2: Audit Management (4-6 weeks)
Extends Template-Instance pattern. Adds: scheduled + ad-hoc audits (like WorkPulse "Schedule" and "Ad-hoc" tabs), sections with weighted scoring, conditional child questions, geo-fencing (compare device GPS to location coords), **audit duration tracking** (start to submit time), validation audits (secondary reviewer), audit comparison (side-by-side), score trend analysis with arrows (e.g., "100% (3% ▲)"), Grid/Card view toggle for audit summary, Completion % and Compliance report views, Action Plan tracking.

### Phase 3: Facilities & Equipment Maintenance (3-4 weeks)
Extends LocationEquipment model (already in Phase 1). Adds: populate model/serialNumber/installDate/warrantyExpiry fields, **approval-based work order workflow** (RGM submits → District/Multi-unit Manager approves & assigns vendor → vendor performs work → verification → completed; Director of Ops+ can approve at any stage; rejected requests return to submitter with notes), Vendor model with contact info and specialty, **vendor service board** with vendor selector (like WorkPulse Desk), estimated vs actual cost tracking with invoice upload, work order comment trail with status change history, preventive maintenance scheduling (recurring work orders), ticket unread counts. Permissions split: `maintenance.submit` (RGM) vs `maintenance.approve` (District Manager+).

### Phase 4: Guest Service & Retention (2-3 weeks)
Complaint intake arrives via **inbound webhooks** (Step 14) from POS/email/social integrations, including **Resend inbound email webhook** (`/api/resend/inbound/route.ts`) — auto-assigned to RGM (homeUser) at that location; if no RGM, left unassigned and Multi-unit Manager notified. **Resolution workflow**: Store Manager must provide an action plan and resolution before a complaint can be closed (enforced in UI and API — `actionPlan` and `resolution` fields required for status transition to `resolved`). District Manager+ can review resolutions. FYI-only cases bypass the resolution requirement. Adds: webhook-to-complaint mapping, response deadline (SLA) with first-response tracking, auto-escalation for overdue complaints, in-app communication (email templates via Resend), FYI and Escalated case classification, **Complaint Analytics and Complaint Resolution reports**, Guest Feedback collection, resolution analytics. Sales data (also from webhooks) is correlated with complaint volume for insights.

---

## Verification Plan

1. **Local dev**: `npm run dev` — login as admin, create equipment types, assign to location, create a template with equipment-linked tasks, execute a checklist, verify CA auto-creation with value vs target display
2. **Mobile test**: Chrome DevTools device mode + real phone on same network — verify bottom nav, touch targets, photo capture, checklist execution flow
3. **Compliance views**: Verify Task Dashboard grid shows readings color-coded by compliance, category tabs show correct %, daily tasks printable view works
4. **Multi-tenancy**: Create 2 orgs, verify complete data isolation
5. **User hierarchy**: Create Franchisee → Director → Multi-unit Manager → RGM chain, verify location-scoped data access
6. **SaaS admin**: Provision a new org via saas-admin portal, verify subscription created, org can log in
7. **Webhooks (SaaS admin only)**: Configure webhook endpoints for an org in saas-admin, POST test complaint + sales payloads to `/api/webhooks/{slug}/complaints` and `/api/webhooks/{slug}/sales`, verify records created + events logged. Confirm tenant users have zero visibility on webhook config.
8. **API keys (SaaS admin only)**: Generate API key for an org via saas-admin, call `/api/v1/completions` with Bearer auth, verify scoped read-only access + rate limiting. Confirm tenant users cannot see or manage API keys.
9. **Stripe**: Test checkout flow, verify webhook updates subscription status
10. **Support**: Create ticket as tenant user, reply as SaaS admin, verify email sent + unread tracking
11. **Docker**: `docker build -t walkthefloor .` + `docker run` against local PostgreSQL
12. **Offline**: Disconnect network, complete a checklist task, verify it saves to localStorage, reconnect and verify sync
13. **Photo upload**: Capture photo, verify client-side resize (1200px max, 80% JPEG), verify presigned URL upload to R2
14. **Auto-save**: Complete individual tasks, verify each POSTs immediately, verify progress bar updates, verify auto-completion on all required tasks done
15. **SaaS admin auth**: Login at `/saas-login` as SaasAdmin user, verify separate session from tenant users
16. **Template library**: Create brand template in SaaS admin, copy to new org during provisioning, verify template cloned correctly
17. **Notifications**: Trigger a missed checklist, verify in-app bell notification, email via Resend, SMS via Twilio to RGM
18. **Dokploy**: Deploy with Dockerfile, set env vars, POST /api/setup (runs `prisma migrate deploy` + seed), verify /api/health

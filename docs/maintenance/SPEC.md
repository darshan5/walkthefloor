# Maintenance Requests & Approvals — Specification

> Work order lifecycle for reactive maintenance: submit, approve, assign, track, complete.

---

## 1. Overview

Module 3 of WalkTheFloor. Restaurant managers (RGM) submit maintenance requests when equipment breaks or facilities need repair. District-level managers (Multi-unit Manager+) approve, assign to an internal user or external vendor, and close work orders when complete. Mobile-first — field workers create requests on the spot with photos from their phone.

This is **reactive maintenance only** — no scheduled/preventive maintenance in v1.

---

## 2. Users & Access

Permissions follow the existing Role model (JSON permissions field). The relevant permission keys for this module:

| Action | Minimum Role | Permission Key |
|--------|-------------|----------------|
| Create work order | RGM | `maintenance.create` |
| View work orders (own location) | RGM | `maintenance.view` |
| Approve / reject | Multi-unit Manager | `maintenance.approve` |
| Assign (at approval time) | Multi-unit Manager | `maintenance.approve` |
| Mark in progress | Assignee (any role) | — (checked by assigneeId) |
| Mark completed | Multi-unit Manager | `maintenance.complete` |
| Cancel | Multi-unit Manager | `maintenance.complete` |
| Edit cost fields | Multi-unit Manager | `maintenance.complete` |
| Manage vendors | Director | `admin.vendors` |

**Self-approval rule:** When a Multi-unit Manager+ creates a work order, it skips `pending_approval` and goes directly to `approved`. The creation form shows assignment fields (user/vendor, estimated cost, due date) inline.

---

## 3. Data Model

### Existing models (already in schema)

**WorkOrder** — the core entity.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| title | String | Required |
| description | String? | Optional details |
| priority | Priority enum | LOW, MEDIUM, HIGH, CRITICAL. Default MEDIUM |
| status | String | `pending_approval`, `approved`, `in_progress`, `completed`, `rejected`, `cancelled` |
| locationId | FK → Location | Required |
| equipmentId | FK → LocationEquipment? | Optional — which piece of equipment |
| createdById | FK → User | Who submitted |
| approvedById | FK → User? | Who approved |
| approvedAt | DateTime? | When approved |
| rejectedAt | DateTime? | When rejected |
| rejectionNotes | String? | Required on rejection |
| vendorId | FK → Vendor? | Assigned vendor (mutually exclusive with assigneeId) |
| assigneeId | FK → User? | Assigned internal user (mutually exclusive with vendorId) |
| estimatedCost | Float? | Set at approval time |
| actualCost | Float? | Set during/after work |
| expenseNotes | String? | Cost details |
| invoiceUrl | String? | Link to invoice |
| photoUrls | Json | Array of photo URLs from creation |
| dueDate | DateTime? | Target completion |
| completedAt | DateTime? | When marked completed |

**Vendor** — external service providers, org-scoped.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | String | Company name |
| contactName | String? | Point of contact |
| email | String? | |
| phone | String? | |
| specialty | String? | e.g. "HVAC", "Plumbing" |
| notes | String? | |
| isActive | Boolean | Default true, soft delete |
| organizationId | FK | Org-scoped |

**WorkOrderComment** — activity timeline entries.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| workOrderId | FK → WorkOrder | |
| userId | String | Who commented |
| content | String | Comment text |
| statusChange | String? | If this comment represents a status transition, stores the new status |

### Schema changes needed

The existing schema covers the data model. One change:

- Update `WorkOrder.status` default from `"submitted"` to `"pending_approval"` (or `"approved"` when created by Multi-unit Manager+, handled in application logic).

### Constraints

- `vendorId` and `assigneeId` are mutually exclusive — exactly one must be set at approval time.
- `rejectionNotes` is required when status moves to `rejected`.
- `approvedById` and `approvedAt` are set together on approval.

---

## 4. Status Flow

```
RGM creates ──────► pending_approval ──► approved ──► in_progress ──► completed
                          │                  │
                          ▼                  ▼
                       rejected          cancelled
                     (terminal)          (terminal)

Multi-unit Manager+ creates ──► approved ──► in_progress ──► completed
                                    │
                                    ▼
                                cancelled
```

| Transition | Who | Action |
|-----------|-----|--------|
| → pending_approval | RGM | Creates work order |
| → approved | Multi-unit Manager+ | Approves (assigns user or vendor, sets est. cost/due date) |
| → approved | Multi-unit Manager+ | Creates work order (auto-approved, assigns inline) |
| → rejected | Multi-unit Manager+ | Rejects with required notes |
| → in_progress | Assignee | Starts working on it |
| → completed | Multi-unit Manager+ | Marks work done |
| → cancelled | Multi-unit Manager+ | Cancels an approved WO that's no longer needed |

Terminal states: `completed`, `rejected`, `cancelled`.

---

## 5. API Design

All routes under `/api/v1/work-orders/` and `/api/v1/vendors/`.

### Work Orders

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/work-orders` | List work orders (filtered by location, status, priority, date range, tab) | RGM+ |
| GET | `/api/v1/work-orders/[id]` | Get work order detail with comments | RGM+ |
| POST | `/api/v1/work-orders` | Create work order | RGM+ |
| PATCH | `/api/v1/work-orders/[id]/approve` | Approve + assign | Multi-unit Manager+ |
| PATCH | `/api/v1/work-orders/[id]/reject` | Reject with notes | Multi-unit Manager+ |
| PATCH | `/api/v1/work-orders/[id]/start` | Mark in progress | Assignee |
| PATCH | `/api/v1/work-orders/[id]/complete` | Mark completed | Multi-unit Manager+ |
| PATCH | `/api/v1/work-orders/[id]/cancel` | Cancel | Multi-unit Manager+ |
| PATCH | `/api/v1/work-orders/[id]/cost` | Update cost fields | Multi-unit Manager+ |
| POST | `/api/v1/work-orders/[id]/comments` | Add comment | Anyone involved |
| GET | `/api/v1/work-orders/counts` | Status counts for KPI cards | RGM+ |

### Vendors

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/vendors` | List vendors | RGM+ (for assignment picker) |
| POST | `/api/v1/vendors` | Create vendor | Director+ |
| PATCH | `/api/v1/vendors/[id]` | Update vendor | Director+ |
| DELETE | `/api/v1/vendors/[id]` | Deactivate vendor (soft delete) | Director+ |

### Create Work Order — Request Body

**RGM (pending_approval):**
```json
{
  "title": "Walk-in cooler not cooling",
  "description": "Temperature reading 55°F, should be 38°F",
  "priority": "HIGH",
  "locationId": "clx...",
  "equipmentId": "clx...",
  "photoUrls": ["https://..."],
  "dueDate": "2026-08-20T00:00:00Z"
}
```

**Multi-unit Manager+ (auto-approved):**
```json
{
  "title": "Replace grease trap",
  "priority": "MEDIUM",
  "locationId": "clx...",
  "assigneeId": "clx...",
  "estimatedCost": 450,
  "dueDate": "2026-08-25T00:00:00Z"
}
```

### Approve — Request Body
```json
{
  "assigneeId": "clx...",
  "vendorId": null,
  "estimatedCost": 800,
  "dueDate": "2026-08-22T00:00:00Z",
  "notes": "Use SJB Distribution, they've done this before"
}
```

---

## 6. UI/UX

### 6.1 Maintenance List Page (`/maintenance`)

**Top section:** KPI cards showing counts by status:
- Pending Approval (amber)
- Approved (blue)
- In Progress (indigo)
- Completed (green)

**Tabs:**
- **All** — all work orders for the user's location(s)
- **My Requests** — work orders created by the current user
- **Needs Approval** — only visible to Multi-unit Manager+, shows `pending_approval` WOs for their locations

**Filters:** Location (if multi-location user), priority, status, date range.

**List:** Card layout, each card shows:
- Title (bold)
- Location name
- Priority badge (color-coded)
- Status badge (color-coded)
- Assignee name or vendor name (if assigned)
- Created date (relative, e.g. "2 days ago")

**FAB:** Circle + button, bottom-right, opens create form.

### 6.2 Create Work Order (full-screen sheet on mobile, modal on desktop)

**RGM form:**
- Title (text input, required)
- Description (textarea, optional)
- Priority (select, default MEDIUM)
- Location (select, auto-filled if single location)
- Equipment (select, filtered by selected location, optional)
- Photos (camera capture / file upload, optional)
- Due Date (date picker, optional)

**Multi-unit Manager+ form** — same fields plus:
- Assign To toggle: "Internal User" / "Vendor"
  - Internal: user picker (filtered to selected location)
  - Vendor: vendor picker (from org vendor list)
- Estimated Cost (currency input, optional)

### 6.3 Work Order Detail (full page)

**Header:** Title, status badge, priority badge, location, "Created by [name] on [date]"

**Details section:**
- Description
- Equipment (if linked, with name and type)
- Due date
- Photos (tappable gallery)

**Assignment section** (visible after approval):
- "Assigned to [user name]" or "Assigned to [vendor name]"
- "Approved by [name] on [date]"
- Approval notes (if any)

**Cost section** (visible after approval, editable by Multi-unit Manager+):
- Estimated cost
- Actual cost
- Expense notes
- Invoice URL

**Activity timeline:** Chronological list of comments and status changes. Status changes rendered as system messages (e.g. "[Name] approved this work order"). Comments rendered with user avatar, name, timestamp, content.

**Action buttons** (contextual based on status and user role):
- `pending_approval` + Multi-unit Manager+: "Approve" (green), "Reject" (red)
- `approved` + assignee: "Start Work"
- `in_progress` + Multi-unit Manager+: "Mark Completed"
- `approved` + Multi-unit Manager+: "Cancel"
- Any status (not terminal): "Add Comment"

### 6.4 Approval Modal (sheet on mobile)

- Assign To: toggle "Internal User" / "Vendor"
  - User picker or vendor picker based on selection
- Estimated Cost (currency input, optional)
- Due Date (date picker, optional — can override submitter's request)
- Notes (textarea, optional)
- "Approve" button

### 6.5 Rejection Modal

- Rejection Notes (textarea, required)
- "Reject" button

### 6.6 Admin: Vendor Management (`/admin/vendors`)

Simple data table:
- Columns: Name, Contact, Phone, Email, Specialty, Status (Active/Inactive)
- Add Vendor button → modal form
- Row actions: Edit, Deactivate/Activate
- Search by name or specialty
- Access: Director+ only

---

## 7. Notifications

**Single email notification:** When an RGM creates a work order (status = `pending_approval`), send an email to all Multi-unit Managers+ whose assigned locations include the work order's location.

Email content:
- Subject: "New maintenance request at [Location Name]"
- Body: Title, priority, description preview, link to the work order detail page

Multi-unit Manager+ created work orders do NOT trigger emails (they self-approve).

No other notifications in v1 — no push, no SMS, no status change emails.

---

## 8. Scope Boundaries

**In v1:**
- Reactive work order CRUD with full lifecycle
- Approval/rejection flow
- User or vendor assignment
- Cost tracking (estimated + actual)
- Photo upload on creation
- Text comments + status change timeline
- Vendor CRUD (admin)
- Approval pending email to Multi-unit Managers+

**Explicitly deferred:**
- Preventive/scheduled maintenance (recurring work orders)
- Asset registry (serial numbers, warranty dates, service history)
- Notifications beyond the one approval email
- Cross-module linking (auto-create WO from corrective actions)
- Maintenance reporting/analytics (cost trends, vendor performance, time-to-resolution)
- File attachments on comments (photos only on initial WO)
- Kanban/drag-drop board view

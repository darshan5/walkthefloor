# Maintenance Requests & Approvals — Implementation Phases

> Sequenced roadmap. Each phase has clear deliverables and validation criteria.
> See [SPEC.md](./SPEC.md) for the full architecture and design decisions.

---

## Phase Summary

| Phase | Focus | Depends On | Status |
| ----- | ----- | ---------- | ------ |
| 1 | Schema + API + Vendor Admin | — | Not started |
| 2 | List View + Create Form | 1 | Not started |
| 3 | Detail View + Approval Flow | 2 | Not started |
| 4 | Status Transitions + Comments | 3 | Not started |
| 5 | Email Notification | 4 | Not started |

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
schema      list UI      detail       actions     email
+ API       + create     + approve    + comments  notification
+ vendors   form         modal        + timeline
```

---

## Phase 1 — Schema, API Routes, Vendor Admin

Set up the data layer and vendor management page.

### Deliverables

- [ ] Update `WorkOrder.status` default from `"submitted"` to `"pending_approval"`
- [ ] Add `maintenance.create`, `maintenance.view`, `maintenance.approve`, `maintenance.complete`, `admin.vendors` to the built-in role permission seeds
- [ ] API: `GET /api/v1/work-orders` — list with filters (location, status, priority, date range, tab: all/my/needs-approval)
- [ ] API: `GET /api/v1/work-orders/counts` — status counts for KPI cards
- [ ] API: `GET /api/v1/work-orders/[id]` — detail with comments
- [ ] API: `POST /api/v1/work-orders` — create (handles both RGM and auto-approve for Multi-unit Manager+)
- [ ] API: `PATCH /api/v1/work-orders/[id]/approve` — approve + assign
- [ ] API: `PATCH /api/v1/work-orders/[id]/reject` — reject with notes
- [ ] API: `PATCH /api/v1/work-orders/[id]/start` — mark in progress (assignee only)
- [ ] API: `PATCH /api/v1/work-orders/[id]/complete` — mark completed
- [ ] API: `PATCH /api/v1/work-orders/[id]/cancel` — cancel
- [ ] API: `PATCH /api/v1/work-orders/[id]/cost` — update cost fields
- [ ] API: `POST /api/v1/work-orders/[id]/comments` — add comment
- [ ] API: `GET /api/v1/vendors` — list vendors
- [ ] API: `POST /api/v1/vendors` — create vendor
- [ ] API: `PATCH /api/v1/vendors/[id]` — update vendor
- [ ] API: `DELETE /api/v1/vendors/[id]` — deactivate vendor
- [ ] Admin page: `/admin/vendors` — vendor CRUD table with add/edit/deactivate

### Tests

- [ ] Work order creation sets correct initial status based on user role
- [ ] Approval sets assignee/vendor (mutually exclusive), approvedById, approvedAt
- [ ] Rejection requires notes
- [ ] Status transition validation (can't approve a completed WO, etc.)
- [ ] Vendor CRUD with org scoping

### Validates

All API endpoints return correct data. Vendors can be managed from admin. Work order lifecycle works at the data layer.

---

## Phase 2 — List View + Create Form

Build the main maintenance page and work order creation.

### Deliverables

- [ ] Maintenance list page (`/maintenance`) replacing placeholder
- [ ] KPI cards: Pending Approval, Approved, In Progress, Completed — with counts
- [ ] Tabs: All / My Requests / Needs Approval (Multi-unit Manager+ only)
- [ ] Filters: location, priority, status, date range
- [ ] Card-based work order list (title, location, priority badge, status badge, assignee/vendor, created date)
- [ ] Empty states per tab
- [ ] FAB (circle + button, bottom-right) to open create form
- [ ] Create work order form — full-screen sheet on mobile, modal on desktop
- [ ] RGM form: title, description, priority, location, equipment, photos, due date
- [ ] Multi-unit Manager+ form: adds assign-to toggle (user/vendor picker), estimated cost
- [ ] Photo capture via camera or file upload
- [ ] Location auto-fill for single-location users
- [ ] Equipment dropdown filtered by selected location

### Tests

- [ ] List renders work orders with correct badges
- [ ] Tab filtering works (my requests, needs approval)
- [ ] Create form shows/hides assignment fields based on user role
- [ ] Created work order appears in list

### Validates

Users can view work orders and create new ones. The list is filterable and mobile-friendly. Multi-unit Manager+ creation auto-approves with inline assignment.

---

## Phase 3 — Detail View + Approval Flow

Build the work order detail page and approval/rejection modals.

### Deliverables

- [ ] Work order detail page (`/maintenance/[workOrderId]`)
- [ ] Header: title, status badge, priority badge, location, created by + date
- [ ] Details section: description, equipment, due date, photo gallery
- [ ] Assignment section: assignee/vendor name, approved by + date, approval notes
- [ ] Cost section: estimated cost, actual cost, expense notes, invoice URL (editable by Multi-unit Manager+)
- [ ] Approval modal/sheet: assign-to toggle (user/vendor picker), estimated cost, due date, notes, approve button
- [ ] Rejection modal/sheet: rejection notes (required), reject button
- [ ] Contextual action buttons based on status + user role

### Tests

- [ ] Detail page renders all sections with correct data
- [ ] Approval modal assigns user OR vendor (not both)
- [ ] Rejection requires notes — form validates
- [ ] Cost fields only editable by Multi-unit Manager+
- [ ] Action buttons show/hide based on role and status

### Validates

Full work order detail view works. Approvers can approve (with assignment) or reject from the detail page. Cost tracking is editable.

---

## Phase 4 — Status Transitions + Comments

Wire up remaining status changes and the activity timeline.

### Deliverables

- [ ] "Start Work" action (assignee marks `approved` → `in_progress`)
- [ ] "Mark Completed" action (Multi-unit Manager+ marks → `completed`, sets `completedAt`)
- [ ] "Cancel" action (Multi-unit Manager+ marks → `cancelled`)
- [ ] Activity timeline on detail page: comments + status changes in chronological order
- [ ] Status change entries rendered as system messages (e.g. "[Name] approved this work order")
- [ ] Add comment form (text input + submit) at bottom of timeline
- [ ] Status badge updates immediately after transition (optimistic or refetch)
- [ ] KPI card counts update after status changes

### Tests

- [ ] Each status transition validates current status (can't start an already-in-progress WO)
- [ ] Only assignee can mark in progress
- [ ] Only Multi-unit Manager+ can complete or cancel
- [ ] Comments appear in timeline with correct user and timestamp
- [ ] Status change comments auto-generated with `statusChange` field

### Validates

Complete work order lifecycle works end-to-end: create → approve → start → complete. Activity timeline shows full history.

---

## Phase 5 — Email Notification

Send approval-pending email when an RGM creates a work order.

### Deliverables

- [ ] Email template: "New maintenance request at [Location Name]" with title, priority, description preview, link
- [ ] On RGM work order creation, query all Multi-unit Managers+ with visibility over the WO's location
- [ ] Send email via Resend to all matching users
- [ ] Skip email for Multi-unit Manager+ created work orders (auto-approved)
- [ ] Email includes direct link to the work order detail page

### Tests

- [ ] Email sent only for RGM-created work orders
- [ ] Email sent to correct recipients (Multi-unit Managers+ for that location)
- [ ] No email for self-approved work orders
- [ ] Email contains correct work order details and link

### Validates

Multi-unit Managers receive an email when a new work order needs their approval. No false notifications for self-approved orders.

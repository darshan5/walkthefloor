# Tasks — Implementation Phases

> Sequenced roadmap. Each phase has clear deliverables and validation criteria.
> See [SPEC.md](./SPEC.md) for the full architecture and design decisions.

---

## Phase Summary

| Phase | Focus | Depends On | Status |
| ----- | ----- | ---------- | ------ |
| 1 | Schema + Permissions + Service + API | — | Not started |
| 2 | Task List + Create Form | 1 | Not started |
| 3 | Task Detail + Comments + Subtasks | 2 | Not started |
| 4 | Templates + Admin Settings | 1 | Not started |
| 5 | Recurrence + Cron | 1 | Not started |
| 6 | Checklist Failure Integration | 1 | Not started |
| 7 | Navigation Update (sidebar, bottom nav) | 2 | Not started |

```
Phase 1 ──┬── Phase 2 ──► Phase 3
schema     │   list UI     detail + comments
+ API      │
           ├── Phase 4
           │   templates + admin
           │
           ├── Phase 5
           │   recurrence + cron
           │
           ├── Phase 6
           │   checklist failure → task
           │
           └── Phase 7
               nav update
```

Phases 2-7 all depend on Phase 1. Phases 2→3 are sequential. Phases 4, 5, 6, 7 are independent of each other and of Phase 3.

---

## Phase 1 — Schema, Permissions, Service, API Routes

### Deliverables

- [ ] Add `Task`, `TaskComment`, `TaskTag`, `TaskItemTag`, `TaskTemplate` models to Prisma schema
- [ ] Add permissions: `tasks.view`, `tasks.create`, `tasks.assign`, `tasks.manage`
- [ ] Update built-in role permission lists
- [ ] Run migration on production DB
- [ ] Service: `task-service.ts`
  - CRUD for tasks (with tag + subtask handling)
  - Status transitions with validation
  - Assigned task priority lock enforcement
  - Comments (owner + Multi-unit Manager+ check)
  - Subtask CRUD and status changes
  - Count queries for KPIs
- [ ] Service: `task-tag-service.ts` — tag CRUD (predefined per-org)
- [ ] Service: `task-template-service.ts` — template CRUD
- [ ] All API routes per spec (tasks, tags, templates, subtasks, comments, status)
- [ ] Zod validation on all routes

### Tests

- [ ] Task creation sets correct status and source
- [ ] Assigned task priority cannot be changed via PATCH
- [ ] Subtasks link to parent, can't nest further
- [ ] Comments rejected from non-owner non-manager users
- [ ] Tag and template CRUD with org scoping

### Validates

Full API layer works. All task operations available via endpoints.

---

## Phase 2 — Task List + Create Form

### Deliverables

- [ ] Tasks list page (`/tasks`) replacing old `/checklists/tasks` concept
- [ ] KPI cards: Open, In Progress, Completed (month), Overdue
- [ ] Tabs: All / My Tasks / Assigned by Me (Multi-unit Manager+)
- [ ] Filters: priority, status, tag chips, date range
- [ ] Card list with: title, priority badge, status badge, assignee, location, due date, tags, source icon, subtask progress
- [ ] Assigned tasks: blue left border accent
- [ ] FAB bottom-right → create sheet
- [ ] Create task sheet: title, description, priority, location, assignee, due date, tags (multi-select), subtasks (inline add), from template (select), repeat toggle with recurrence options
- [ ] Priority select disabled when editing assigned tasks
- [ ] Respects global location selector

### Tests

- [ ] List renders tasks with correct badges and accent colors
- [ ] Tab filtering works
- [ ] Create form handles subtasks and template pre-fill
- [ ] Assigned task cards have blue accent

### Validates

Users can browse, filter, and create tasks. Assigned tasks visually distinct.

---

## Phase 3 — Task Detail + Comments + Subtasks

### Deliverables

- [ ] Task detail page (`/tasks/[taskId]`)
- [ ] Header: title, status, priority, location, created by, source badge
- [ ] Assigned badge (blue) if task is assigned
- [ ] Details section: description, due date, tags
- [ ] Subtasks section: list with checkbox toggles, assignee, "Add Subtask" button
- [ ] Action buttons: Start, Complete (contextual by status + role)
- [ ] Edit button (owner or Multi-unit Manager+) → edit sheet
- [ ] Comments timeline: text + status changes
- [ ] Add comment form (owner + Multi-unit Manager+ only)
- [ ] Recurrence info display ("Repeats weekly on Monday")

### Tests

- [ ] Detail renders all sections
- [ ] Subtask checkbox completes/uncompletes
- [ ] Comments only submittable by owner/manager
- [ ] Status actions contextual by role

### Validates

Full task detail view with interactive subtasks and comments.

---

## Phase 4 — Templates + Admin Settings

### Deliverables

- [ ] Admin → Organization → "Tasks" tab
- [ ] Tag management: list with add/delete (same pattern as Info tags)
- [ ] Template management: list with add/edit/delete
- [ ] Template form: name, title, description, priority, tags (multi-select), subtask list (inline add), recurrence rule
- [ ] "From Template" dropdown in create task sheet pre-fills all fields including subtasks

### Tests

- [ ] Template creates task with correct pre-filled fields and subtasks
- [ ] Tag CRUD works with org scoping
- [ ] Only Multi-unit Manager+ can manage templates and tags

### Validates

Admins can define reusable task structures. Users can create tasks from templates.

---

## Phase 5 — Recurrence + Cron

### Deliverables

- [ ] Recurring task creation: set `recurrenceRule`, `baseTitle`, auto-generate `title` with due date suffix
- [ ] On task completion: if `recurrenceRule` exists, create next instance with calculated due date
- [ ] Cron job (add to `instrumentation-node.ts`): check recurring tasks past due, mark as `missed`, create next instance
- [ ] Next due date calculation for all recurrence types (daily, weekly, biweekly, monthly, custom)
- [ ] Recurrence info displayed on task detail page
- [ ] Recurrence options in create/edit form

### Tests

- [ ] Completing a recurring task creates next instance
- [ ] Missed recurring task auto-rolls forward
- [ ] Title format includes due date
- [ ] Each recurrence type calculates correct next date
- [ ] Only one active instance exists at a time

### Validates

Recurring tasks auto-regenerate on completion and roll forward on miss.

---

## Phase 6 — Checklist Failure Integration

### Deliverables

- [ ] Modify checklist failure code path to create a Task instead of a Corrective Action
- [ ] Task source = `checklist_failure`, `completionId` links to source
- [ ] Title = failed item name
- [ ] Priority = HIGH
- [ ] Assigned to RGM at location
- [ ] Location from checklist instance
- [ ] Source badge on task card and detail page links to checklist instance
- [ ] Old CA routes and data remain untouched

### Tests

- [ ] Checklist failure creates a Task (not CA)
- [ ] Task links back to checklist completion
- [ ] Old CAs still accessible via API

### Validates

Checklist failures flow into the Tasks module going forward.

---

## Phase 7 — Navigation Update

### Deliverables

- [ ] Sidebar: Replace "Corrective Actions" link with "Tasks" → `/tasks`
- [ ] Bottom nav: Update tabs to Home, Book, Tasks, Maintenance, Guest Service
- [ ] Ensure "Tasks" permission check uses `tasks.view` (not `checklists`)
- [ ] Old `/checklists/corrective-actions` route still works (historical data)
- [ ] Old `/checklists/tasks` (compliance grid) remains under Book as "Task Dashboard"

### Tests

- [ ] Sidebar shows Tasks link
- [ ] Bottom nav shows 5 correct tabs
- [ ] Navigation works on mobile and desktop

### Validates

Tasks module fully integrated into app navigation.

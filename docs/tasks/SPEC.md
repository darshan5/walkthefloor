# Tasks — Product & Architecture Specification

> Lightweight action items with subtasks, templates, recurrence, and comments. Replaces Corrective Actions going forward.

---

## 1. Overview

Standalone module at `/tasks`. Tasks are action items that can be created manually, auto-generated from checklist failures, or (future) synced from an external project management platform. Replaces the Corrective Actions concept — existing CAs remain in the database but new failures create Tasks instead.

Key concepts:
- **Manual tasks** — any user creates to-dos with tags and priority
- **Assigned tasks** — Multi-unit Manager+ assigns work to users, priority is locked, visually distinct
- **Checklist failure tasks** — auto-created when a checklist item fails, linked to the source
- **Subtasks** — 1 level deep, each with own assignee and status
- **Templates** — predefined task structures for common work
- **Recurring tasks** — auto-regenerate on completion or rollover on missed due date

---

## 2. Users & Access

| Action | Minimum Role | Permission Key |
|--------|-------------|----------------|
| View tasks (own locations) | Team Member | `tasks.view` |
| Create tasks | Team Member | `tasks.create` |
| Assign tasks to others | Multi-unit Manager | `tasks.assign` |
| Manage templates | Multi-unit Manager | `tasks.manage` |
| Set recurrence | Multi-unit Manager | `tasks.manage` |
| Comment on tasks | Task owner OR Multi-unit Manager+ | — (checked in logic) |
| Edit assigned task priority | Nobody (locked) | — |

Location scoping: users see tasks at their assigned locations.

---

## 3. Data Model

### Task

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| title | String | Required. For recurring: includes due date suffix " by M/D" |
| description | String? | Optional details |
| priority | Priority enum | LOW, MEDIUM, HIGH, CRITICAL. Default MEDIUM |
| status | String | `open`, `in_progress`, `completed`, `missed` |
| source | String | `manual`, `checklist_failure`, `external` |
| locationId | FK → Location | Required |
| createdById | FK → User | Who created |
| assigneeId | FK → User? | Who it's assigned to. Null = unassigned/self |
| dueDate | DateTime? | Optional deadline |
| completedAt | DateTime? | When completed |
| parentId | FK → Task? | Null = top-level. Set = subtask |
| templateId | FK → TaskTemplate? | If created from a template |
| completionId | String? | Links to ChecklistCompletion if source = checklist_failure |
| externalId | String? | For future external sync |
| recurrenceRule | Json? | `{type, interval?, dayOfWeek?, dayOfMonth?}` — see Recurrence section |
| baseTitle | String? | For recurring: the template title without the date suffix |
| organizationId | FK → Organization | Org-scoped |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `[organizationId, locationId, status]`, `[assigneeId]`, `[parentId]`.

### TaskComment

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| taskId | FK → Task | Cascade delete |
| userId | String | Who commented |
| content | String | Comment text |
| statusChange | String? | If this represents a status transition |
| createdAt | DateTime | |

### TaskTag (org-level, predefined)

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | String | Unique per org |
| organizationId | FK → Organization | |

### TaskItemTag (join)

| Field | Type | Notes |
|-------|------|-------|
| taskId | FK → Task | Cascade delete |
| tagId | FK → TaskTag | Cascade delete |

Composite PK: `(taskId, tagId)`.

### TaskTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | String | Template name |
| title | String | Default task title |
| description | String? | Default description |
| priority | Priority enum | Default priority |
| tagIds | Json | Array of TaskTag IDs to apply |
| subtasks | Json | Array of `{title, description?}` for auto-created subtasks |
| recurrenceRule | Json? | Default recurrence pattern |
| organizationId | FK → Organization | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

## 4. Status Flow

```
open ──► in_progress ──► completed
  │                         │
  │                         ▼ (if recurring)
  │                    new task created with next due date
  │
  ▼ (if past due + recurring)
missed ──► new task created with next due date
```

| Transition | Who |
|-----------|-----|
| → open | System (auto-create) or any user (manual create) |
| → in_progress | Assignee or creator |
| → completed | Assignee, creator, or Multi-unit Manager+ |
| → missed | System (cron — past due recurring tasks) |

Terminal states: `completed`, `missed`.

---

## 5. Recurrence

### Recurrence Rule (JSON)

```json
{"type": "daily"}
{"type": "weekly", "dayOfWeek": 1}
{"type": "biweekly", "dayOfWeek": 1}
{"type": "monthly", "dayOfMonth": 1}
{"type": "custom", "interval": 10}
```

### Title Format

Recurring tasks store `baseTitle` (e.g. "Clean Ice Machine") and render `title` as `"Clean Ice Machine by 9/1"` with the due date.

### Lifecycle

1. **On completion**: Calculate next due date from recurrence rule. Create new task with same `baseTitle`, description, priority, tags, assignee, subtask templates, recurrence rule. New title = `baseTitle + " by " + nextDueDate`.

2. **On missed (cron)**: If a recurring task's `dueDate` has passed and status is still `open` or `in_progress`:
   - Mark status as `missed`
   - Create next instance with new due date
   - Only one active instance exists at any time

3. **Cron**: Reuse the existing 15-minute overdue check. For recurring tasks past due, mark `missed` and create next instance.

### Next Due Date Calculation

| Type | Calculation |
|------|-------------|
| daily | +1 day |
| weekly | Next occurrence of `dayOfWeek` |
| biweekly | +14 days from due date |
| monthly | Same `dayOfMonth` next month |
| custom | +`interval` days |

---

## 6. Checklist Failure → Task

When a checklist item fails (non-compliant temperature, failed yes/no check):
- Create a Task with `source: "checklist_failure"`
- `completionId` links to the ChecklistCompletion
- Title = failed item name (e.g. "Walk-in cooler temperature non-compliant")
- Priority = HIGH (configurable per-org in future)
- Assigned to the RGM at that location
- Location = checklist instance location

Modify the existing CA-creation code path to create a Task instead. Leave the CA model and routes intact for historical data.

---

## 7. API Design

### Tasks

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/tasks` | List tasks (filters: status, priority, tag, tab, dateFrom/dateTo) | Team Member+ |
| GET | `/api/v1/tasks/counts` | Status counts for KPIs | Team Member+ |
| GET | `/api/v1/tasks/[id]` | Task detail with subtasks + comments | Team Member+ |
| POST | `/api/v1/tasks` | Create task (with optional subtasks, from template) | Team Member+ |
| PATCH | `/api/v1/tasks/[id]` | Edit task (title, desc, priority, tags, due, assignee) | Owner or Multi-unit Manager+ |
| PATCH | `/api/v1/tasks/[id]/status` | Change status (start, complete) | Assignee, owner, or Multi-unit Manager+ |
| POST | `/api/v1/tasks/[id]/comments` | Add comment | Owner or Multi-unit Manager+ |
| POST | `/api/v1/tasks/[id]/subtasks` | Add subtask | Owner or Multi-unit Manager+ |
| PATCH | `/api/v1/tasks/subtasks/[id]/status` | Change subtask status | Subtask assignee, parent owner, or Multi-unit Manager+ |

### Task Tags

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/tasks/tags` | List tags | Team Member+ |
| POST | `/api/v1/tasks/tags` | Create tag | Multi-unit Manager+ (admin) |
| DELETE | `/api/v1/tasks/tags/[id]` | Delete tag | Multi-unit Manager+ (admin) |

### Task Templates

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/tasks/templates` | List templates | Team Member+ |
| POST | `/api/v1/tasks/templates` | Create template | Multi-unit Manager+ |
| PATCH | `/api/v1/tasks/templates/[id]` | Edit template | Multi-unit Manager+ |
| DELETE | `/api/v1/tasks/templates/[id]` | Delete template | Multi-unit Manager+ |

### Create Task — Request Body

```json
{
  "title": "Restock napkins",
  "description": "Front counter and drive-thru stations",
  "priority": "MEDIUM",
  "locationId": "clx...",
  "assigneeId": "clx...",
  "dueDate": "2026-08-20T00:00:00Z",
  "tagIds": ["clx...", "clx..."],
  "subtasks": [
    {"title": "Front counter"},
    {"title": "Drive-thru"}
  ],
  "templateId": "clx...",
  "recurrenceRule": {"type": "weekly", "dayOfWeek": 1}
}
```

---

## 8. UI/UX

### 8.1 Tasks List Page (`/tasks`)

- **KPI cards**: Open, In Progress, Completed (this month), Overdue
- **Tabs**: All / My Tasks / Assigned by Me (Multi-unit Manager+ only)
- **Filters**: Priority, status, tag (multi-select chips), date range
- **Card list**: Title, priority badge, status badge, assignee avatar, location, due date, tag badges, source indicator (clipboard icon for checklist failures), subtask progress ("2/5")
- **Assigned tasks**: Blue left border accent on card to distinguish from self-created
- **FAB**: bottom-right, opens create sheet

### 8.2 Create Task Sheet

- Title (required)
- Description (optional, textarea)
- Priority (select — disabled if editing an assigned task)
- Location (select, auto-filled from global selector)
- Assign To (user select — Team Member sees only self, Multi-unit Manager+ sees all users at location)
- Due Date (date picker)
- Tags (multi-select from predefined list)
- Subtasks (inline add — title field + add button, list of added subtasks with remove)
- From Template (select — pre-fills all fields)
- Repeat (toggle — expands to recurrence options: daily, weekly, biweekly, monthly, custom)

### 8.3 Task Detail Page (`/tasks/[taskId]`)

- **Header**: Title, status badge, priority badge, location, created by + date
- **Source badge**: If from checklist failure — link to checklist instance
- **Assigned badge**: If assigned, show blue "Assigned to you" or "Assigned to [name]"
- **Details**: Description, due date, tags
- **Subtasks section**: List of subtasks with checkbox toggles (complete/uncomplete), assignee, add subtask button
- **Actions**: Start / Complete buttons (contextual), Edit button (owner/manager)
- **Comments timeline**: Comments + status changes, add comment form (owner + Multi-unit Manager+ only)
- **Recurrence info**: If recurring, show pattern ("Repeats monthly on the 1st")

### 8.4 Admin → Organization → Tasks Tab

- **Tags**: List with add/delete (same pattern as Info tags)
- **Templates**: List with add/edit/delete. Template form: name, title, description, priority, tags, subtask list, recurrence rule

---

## 9. Permissions

Add new permission keys:

| Key | Description |
|-----|-------------|
| `tasks.view` | View tasks at assigned locations |
| `tasks.create` | Create tasks |
| `tasks.assign` | Assign tasks to other users |
| `tasks.manage` | Manage templates, tags, recurrence |

Role assignments:
- **Team Member**: `tasks.view`, `tasks.create`
- **RGM**: `tasks.view`, `tasks.create`
- **Multi-unit Manager**: All four
- **Director+**: All four

---

## 10. Bottom Nav Update

Update mobile bottom nav to include the key modules:
- Home, Book, Tasks, Maintenance, Guest Service

Remove "CAs" tab (replaced by Tasks). Keep it to 5 tabs max for mobile usability.

---

## 11. Scope Boundaries

**In v1:**
- Task CRUD with subtasks (1 level), tags, priority, assignee
- Task templates (admin-managed)
- Recurring tasks with auto-rollover
- Comments by owner + Multi-unit Manager+
- Assigned tasks: locked priority, blue accent
- Checklist failures create tasks instead of CAs
- Tags + templates in Admin → Organization → Tasks tab
- Source tracking (manual, checklist_failure, external + externalId)

**Deferred:**
- External platform sync implementation
- File attachments
- Notifications on assignment
- Auto-complete parent when all subtasks done
- Task analytics/reporting

# WorkPulse rOS — Functionality Patterns Extracted

> Extracted from live WorkPulse instance (site.workpulse.com) on 2026-05-19.
> Screenshots saved in `/screenshots/` directory for visual reference.

---

## 1. Platform Architecture Overview

### Module Map (WorkPulse → WalkTheFloor)

| WorkPulse Module | URL Path | WalkTheFloor Equivalent | Phase |
|---|---|---|---|
| **Book** | `/Book` | Checklists & Food Safety | 1 |
| **Corrective Action** | `/Book/CorrectiveAction` | Corrective Actions | 1 |
| **Audit** | `/Audit` | Audit Management | 2 |
| **Desk** | `/Desk` | Facilities Maintenance | 3 |
| **GiSMo** | `/Complaint` | Guest Recovery | 4 |
| Knowledge | `/Knowledge` | Documents/SOPs | 1 |
| Purchasing | `/Purchasing` | — (out of scope) | — |
| Inventory | `/Inventory` | — (out of scope) | — |
| People | `/PeopleAssessment` | — (future) | — |
| Admin | `/AdminMD` | Admin | 1 |
| Report | `/Report` | Reports | 1 |

### Navigation Pattern
- **Top bar**: Logo, greeting ("Good afternoon, Darshan"), notification bell, help, settings gear, user profile dropdown
- **Left sidebar**: Module-specific navigation with collapsible sub-items
- **Main content**: Loaded via iframes (we should NOT replicate this — use Next.js App Router instead)
- **Dashboard home**: "My Apps" grid showing all available modules as icon tiles

---

## 2. Book Module (Checklists & Food Safety) — Phase 1

### Sidebar Navigation Structure
```
Book
├── Task Dashboard          ← Compliance grid (date × equipment × category)
├── Book Dashboard          ← KPI cards + radial chart + category carousel
├── Task Compliance         ← Shift-level compliance by category
├── Task Progress           ← Weekly completion % by region/user
├── Daily Tasks             ← Printable daily task view per location
├── Merchandising           ← Category-specific view
├── Task Completion         ← Historical completion records
└── Corrective Action       ← CA tracking within Book context
```

### 2a. Task Dashboard (screenshot: 03-book-checklists.png)
**The primary manager view.** Shows a date-based grid of temperature readings.

**Key patterns:**
- **Location selector** at top (dropdown: "Main")
- **Category filter** with compliance % per category:
  - All Categories: 99.1%
  - Cold Holding: 98.9%
  - Cooking Temp: 100.0%
  - Dairy Dispenser: 99.1%
  - Food Safety Checklist: 100.0%
  - Hot Holding: 100.0%
  - Master Sanitation: 100.0%
  - Receiving Log: 100.0%
- **Date range** with month navigation (e.g., "Dec 28, 2025 - May 19, 2026")
- **Toggle filters**: All / Daily / Periodic
- **Show Initials** checkbox — shows who recorded each value
- **Completion / Response** toggle buttons
- **Data grid**: Rows = equipment items grouped by category, Columns = dates
  - Each cell shows temperature reading (e.g., "-2°F", "0°F")
  - Color-coded: green for compliant, red for out-of-range (e.g., "37°F" in a freezer)
  - Valid range displayed per equipment group (e.g., "Product Temperature valid Range: -10 - 0°F")
  - Each reading clickable to see details
  - **Time-slot based**: "Walkin Freezer (5 PM)", "Walkin Freezer (1 PM)", "Walkin Freezer (9 AM)", "Walkin Freezer (5 AM)"
- **Chart view** button per equipment row — shows trend line

### 2b. Book Dashboard (screenshot: 16-book-dashboard.png)
**High-level summary view.**

- **Radial/donut chart** showing overall completion %
- **KPI cards**: Open (11), Overdue (0), Completed (0), All (57)
- **Category carousel** (6 slides) — card per category with status
- **"Daily Status"** label
- **Completion Summary** panel: date range + "By Category" / "By Task" toggle
- **Progress bar** showing last 7 days status

### 2c. Task Compliance (screenshot: 04-task-compliance.png)
**Shift-level compliance report.**

- Title: "Shift Task Compliance"
- **TaskType** and **Granularity** filter groups
- **19 categories** with compliance % (all showing 0.0% for this date range):
  Backroom Checklist, Cold Holding, Cooking Temp, Dairy Dispenser, Dining Room, Exterior Checklist, Food Prep Checklist, Food Safety Checklist, Frozen Beverage, Hot Beverage, Hot Holding, Ice Coffee, Manager Checklist, Merchandising, Rest Room Checklist, Sanitizer, Service Area Checklist, Sugar Dispenser, Thermometer Calibration

### 2d. Task Progress (screenshot: 05-task-progress.png)
**Weekly completion % by region/user.**

- Filter: "By Task Percentage %"
- Grid columns: Region \ Week Ending → date columns
- Rows: "ALL" aggregate + per-user breakdown
- Shows percentages like 86.1%, 90.1%, 96.5%, 94.1%, 47.6%

### 2e. Daily Tasks (screenshot: 06-daily-tasks.png)
**Printable daily checklist for field workers.**

- **Location dropdown** (14 locations)
- **Date picker**
- **Category multi-select** ("All selected (19)")
- **Toggles**: Initials, Compact (for print)
- **Print icon** button
- Content grouped by category: "Category: Backroom Checklist", "Category: Cold Holding", etc.
- Each category shows tables with time-slotted tasks

### 2f. Corrective Action within Book (screenshot: 07-corrective-action-book.png)
**CA completion rate by category.**

- **Time range buttons**: Days / Weeks / Months / Quarters
- **Date range navigation** with arrows
- **Export** button
- **Favorite views** / Filter button
- **Color legend**: Corrective Action % Closed
  - 0.0-24.9 (red)
  - 25.0-49.9 (orange)
  - 50.0-74.9 (yellow)
  - 75.0-100 (green)
- **Grid**: rows = categories, cells = % closed values
- **Column chooser** button for customizing visible columns

---

## 3. Book Configuration (Admin → Locations → Book tab)

### Per-Location Book Setup (screenshots: 25-location-book-config.png, 26-equipment-tasks.png)

This is how checklists are actually configured — **per location, not globally.**

**Top-level settings:**
- **Compliance Start Date** — when tracking begins for this location
- **Clone** button — copy entire equipment + task config from another location

**4 configuration tabs:**

#### Equipment Tab
- Table of equipment types with columns: Equipment Type, Quantity, Tasks/Add Task, Actions
- 18 equipment types at Ambler location:
  Dairy Dispenser (1), Dual Grinder (1), Espresso Machine (2), Hot Holding Unit (1), Hot Winter Beverage (1), IC Brewer (1), Island Oasis (1), Pepsi Cooler (1), Reachin Cooler (2), Sandwich Station (1), Softheat Dual Brewer (1), Softheat Single Brewer (1), Sugar Dispenser (1), TAPS (1), Thermometer (1), Turbochef (2), Walkin Cooler (1), Walkin Freezer (1)
- Each equipment has a **quantity** (how many of that type at this location)
- Each equipment has **tasks** — clicking "Tasks (N)" reveals the time-slotted readings
  - e.g., Dairy Dispenser has 7 tasks: "Dairy Dispenser Temp (1 PM)", "Dairy Dispenser Temp (5 AM)", "Dairy Dispenser Temp (5 PM)", "Dairy Dispenser Temp (9 AM)", ...
- **"Add Equipment"** button — 21 equipment types available to add from
- Edit/Remove actions per equipment
- Edit equipment **names** (e.g., "Walkin Freezer 1", "Walkin Freezer 2")

#### Non-Equipment Tab
- For checklist tasks that aren't tied to equipment (e.g., "Are pests present?", cleaning checklists)

#### Task Ordering Tab
- Controls the display order of tasks within the daily view

#### Sensors Tab
- Bluetooth/IoT temperature sensor configuration
- "Add Temperature Sensor" modal

### App Settings → Book Tab (screenshot: 18-app-settings-book.png)
**Organization-wide Book settings:**

- **Task Expiry Notification**: Minutes before expiration to notify (default: 15)
- **Send Daily Book Task Summary Emails**: Toggle
- **Critical Task Email Alerts**: Select critical tasks + required titles for email alerts on non-completion
- **Corrective Action**:
  - Re-Take Reading If CA Is Generated (toggle)
  - Default Due Days For Corrective Action: 2
- **Default category for Task Dashboard Report**: Multi-select of categories (Cold Holding, Cooking Temp, etc.)

### Key Insight: Equipment-Centric Model
WorkPulse's Book module is **equipment-centric**, not template-centric:
1. You define equipment types at the org level
2. You assign equipment to each location with quantities
3. You configure tasks (readings) per equipment type at specific time slots
4. The system generates daily tasks automatically based on this config
5. Non-equipment tasks (cleaning checklists, yes/no questions) are separate

**This differs from our PLAN.md** which uses a template → instance model. We should consider:
- Keeping our template model (it's more flexible) but adding equipment as a first-class concept within templates
- Adding time-slot scheduling (5 AM, 9 AM, 1 PM, 5 PM) as a schedule option
- Supporting equipment quantity (multiple units of same type)

---

## 4. Corrective Action Module (screenshot: 13-corrective-action-listing.png)

### Standalone CA Listing
**1,786 total CAs, 438 assigned to current user ("My").**

**CA Card Layout** (each CA is a horizontal card):
- **Source task name**: "Walkin Freezer (1 PM)", "Food Safety Checklist (Daily)"
- **Location** with icon: "Horsham", "Ambler"
- **Question/Reading type**: "Product Temperature", "Are pests present?", "Bottom Temperature"
- **Value vs. Target**: `38 °F (-10.0°F to 0.0°F | Target: -5 °F)` or `Yes (Target: No)`
- **Equipment name**: "Walkin Freezer 1", "Reachin Cooler 1"
- **Due date** with icon: "Due on May 19, 2026"
- **Completion date** (if closed): "· Completed May 17, 2026"
- **Status badge**: Open (blue) or Closed (green)
- **Assignee** with initials avatar, name, role, date: "DR Dave Regis, Restaurant General Manager, May 18, 2026"

**Detail Panel** (right side, on card click):
- Same info as card, expanded
- **Add Comment** and **Share** buttons
- **Comments section**: "Comments (1)" with timestamped entries
  - Shows status change history: "Changed status from Open to Closed. Wrong data entered"

**Filters:**
- Search by Assignee, Title & Location
- Filter button (advanced)
- Sort toggle (ascending/descending)
- Export to Excel and PDF
- All / My tabs

---

## 5. Audit Module (screenshots: 08-10)

### Sidebar Structure
```
Audit
├── Submission
│   ├── My Audits        ← Personal audit queue
│   └── Team Audits      ← Team's audit queue
├── Reports
│   ├── Summary          ← All completed audits with scores
│   ├── Audit Dashboard  ← Visual dashboard
│   ├── Completion %     ← Completion rate report
│   └── Compliance       ← Compliance report
└── Action Plan          ← Follow-up action tracking
```

### My Audits (screenshot: 08-audit-module.png)
- **Tabs**: Schedule (0) | Ad-hoc (2)
- **Status filters**: Pending | In-Progress
- **Search**: by Audit name, Location
- **Grid columns**: Audit Name, Location Abbr, Due Date, Action
- **Ad-hoc audits** (screenshot: 09-audit-adhoc.png): show form name + "Start" button
  - "Assemble Check Present", "Dunkin Operations Assessment"

### Audit Summary (screenshot: 10-audit-summary.png)
- **View toggle**: Grid View / Card View
- **Search**: by Audit, Location, Auditor
- **Filters** + **Export** buttons
- **Grid columns**: Form Details, Location/Submitted On, Submitted By, Duration/Score, Action Plan, Ticket ID
- **1,421 audit records** across 57 pages
- Each row shows:
  - Audit name (e.g., "RFSS", "DD Ops Connect")
  - Type badges: "Scheduled", "Standard Audit"
  - Location + timestamp
  - Auditor name + role
  - **Duration** (e.g., "3m 4s", "23h 15m 53s")
  - **Score** with trend: "100% (0% ▲)", "100% (3% ▲)", "100% (100% ▲)"
- **Pagination**: 25/50/75/100 items per page

---

## 6. GiSMo — Guest Recovery (screenshot: 11-gismo-complaints.png)

### Complaints Dashboard
- **Date range selector** with predefined ranges
- **Summary cards**: FYI Cases (0), Escalated Cases (0)
- **4 KPI status cards** (likely: New, Open, In Progress, Resolved)
- **Reports section**: Complaint Analytics, Complaint Resolution
- **Feedback section**: Guest Feedback with count badge
- **Search**: by Title, Case Number, Responsible Person & PC Number
- **Sort**: Last Modify (ascending/descending)
- **Filter** and **Export** buttons
- **Tabs**: All / My

---

## 7. Desk — Maintenance (screenshot: 12-desk-maintenance.png)

### Ticket Board
- **Vendor Service Board** with vendor selector dropdown (e.g., "SJB (Distribution)")
- **Date summary**: "Summary for Last 60 days"
- **Status KPI cards**: All (0), Open (0), In Progress (0), Closed (0) — each with unread count
- **Search**: by title, employee, ticket ID, PC Number
- **Export**, **Filter** buttons
- **View toggle** (list/grid)
- **Tabs**: All / My
- **"Add new ticket"** floating button with Title + Description fields
- **"No ticket available"** empty state

---

## 8. Admin Module

### Sidebar Structure (screenshot: 14-admin.png)
```
Admin
├── Organization
│   ├── Profile              ← Org name, branding
│   ├── App Settings         ← Per-module configuration (tabs: General, Audit, Book, Desk, GiSMo, People, Reports)
│   ├── Shifts               ← AM/PM/Overnight shift definitions
│   ├── Location Report      ← Overview of all locations
│   ├── MDR Management       ← Mobile Device Registration
│   ├── Titles               ← Job titles/roles
│   ├── Blackout Dates       ← Dates to skip scheduling
│   ├── Appendices           ← Reference attachments
│   └── Restricted Words     ← Content filtering
├── Users                    ← User management
├── Org. Hierarchy           ← Reporting structure visualization
├── Locations                ← Location CRUD with per-module config
├── Audit                    ← Audit-specific admin (expandable)
├── GiSMo                   ← Complaint-specific admin (expandable)
├── Desk                    ← Maintenance-specific admin (expandable)
└── Report Scheduler         ← Automated report delivery
```

### Shift Configuration (screenshot: 19-shifts.png)
- 3 predefined shifts: **AM** (05:00-13:00), **PM**, **Overnight**
- Each shift has: Name, Start Time, End Time

### MDR Management (screenshot: 20-mdr-management.png)
- **Grid columns**: Action, Device ID, Location, Make, OS Version, Registration Date, Last Active, Applications
- **"+ Device"** button to register new devices
- **Search**, **Export**, column-level filters

### User Management (screenshots: 21-22)

**User List** (22 active users):
- **Columns**: Checkbox, User Details, Manager, Home Location, Action
- **User Details** shows: Initials avatar (or photo), Name, Confirmation status badge, Account type ("Full Account"), Title
- **Manager** column: Manager name + their title
- **Home Location**: Primary location + "Assigned Locations (N)" for multi-location users
- **Actions**: Reset Password per-row
- **Toolbar**: Add User, Reset Password, Resend Confirmation, Assign Location, More
- **Filters**: Search by Username/Home Location/Name/Title/Email
- **Bulk actions**: Active toggle, View Hierarchy, Import Users, Export Users
- **Pagination**: 100/150/200 per page

**User Detail Modal** (screenshot: 23-user-detail-modal.png):
4 collapsible sections, each with "Manage..." link:

1. **User Details**: Name, Username (email), User Type (Full Account), Email, Birth Date, Hire Date
2. **Title/Roles**: Title, Manager, Roles count (with Manage link)
3. **Location Access**: Home Location, Assigned Locations count
4. **App Settings**: App Access list (Admin, Audit, Book, Desk, GiSMo, Inventory, Knowledge, News, People, Purchasing, Reports, RMS, Web)

**User Hierarchy** (from data):
```
Franchisee (Darshan Patel)
├── Director of Operations (Keith Baldassano, Brian Mascaro)
│   ├── Multi-unit Manager (Kevin McWilliams → 5 locations)
│   │   ├── Restaurant General Manager (per location)
│   │   └── ...
│   ├── Multi-unit Manager (Vikas Sharma → 4 locations)
│   │   ├── Restaurant General Manager (per location)
│   │   └── ...
│   └── Multi-unit Manager (Denish Parekh → 3 locations)
│       ├── Restaurant General Manager (per location)
│       └── ...
└── Direct reports (Office Admin, etc.)
```

### Location Management (screenshot: 24-locations.png)
- **14 locations**: Ambler, Chalfont, Flourtown, Hatfield, Horsham, Jamison, Kmart, Lansdale, Main, Norristown, street rd, Trombo, Trooper, Wawa
- **Left panel**: Location list with search
- **Right panel**: Location detail with tabs:
  - **Location**: Name/Sub-region, Address/Email, Geo-Fencing, Hours
  - **Complaint**: GiSMo config per location
  - **Book**: Equipment + task configuration (see Section 3)
  - **Audit**: Audit config per location
- **PC Number** (store number) displayed: e.g., "363182"
- **Add Location** and **Export** buttons
- **Show Inactive** toggle

---

## 9. Key Design Patterns for WalkTheFloor

### Pattern: Equipment-Centric Task Configuration
- Equipment types defined at org level (21 types available)
- Each location picks which equipment types it has + quantities
- Tasks are tied to equipment + time slots (e.g., "Walkin Cooler (5 AM)")
- Non-equipment tasks handled separately (cleaning, yes/no questions)
- **Clone** feature to copy config between locations

### Pattern: Hierarchical User Management
- 4-level hierarchy: Franchisee → Director of Ops → Multi-unit Manager → Restaurant General Manager
- Manager assignment creates reporting chain
- Users have Home Location + additional Assigned Locations
- App-level access control (which modules a user can see)
- User Types distinguish account capabilities (Full Account vs device-only)

### Pattern: Multi-Dimensional Compliance Reporting
- Compliance tracked across: category × equipment × time-slot × date × location
- Multiple report views: Task Dashboard (grid), Compliance (shift-level), Progress (weekly %), Daily Tasks (printable)
- Color-coded compliance ranges (green/yellow/orange/red)
- Trend indicators on scores (e.g., "3% ▲")

### Pattern: Corrective Action Auto-Generation
- Non-compliant readings automatically generate CAs
- CA shows: actual value vs. target range with tolerance
- Default 2-day due date (configurable in App Settings)
- Option to re-take reading when CA is generated
- Comment trail with status change history
- CA % closed tracked per category with color-coded heatmap

### Pattern: Shift-Based Scheduling
- 3 shifts defined org-wide: AM (05:00-13:00), PM, Overnight
- Tasks scheduled at specific times within shifts (5 AM, 9 AM, 1 PM, 5 PM)
- Compliance tracked per-shift
- Task expiry notification (configurable minutes before)

### Pattern: Location as Configuration Hub
- Each location is a configuration unit with its own:
  - Equipment list and quantities
  - Task assignments and ordering
  - Sensor configuration
  - Geo-fencing settings
  - Operating hours
  - Compliance start date
- Clone feature for rapid multi-location setup

---

## 10. Implications for PLAN.md Updates

### Confirm / Keep As-Is
- Multi-tenancy model (Organization → Location) ✅
- JWT with permissions ✅
- PIN-based device login (MDR) ✅
- Corrective Action with status lifecycle ✅
- Temperature logging ✅
- Role-based dashboards ✅

### Consider Adding
1. **Equipment model** as first-class entity in Phase 1 (not just Phase 3)
   - Equipment types at org level
   - Equipment instances per location with quantities + names
   - Tasks tied to equipment + time slots
2. **Shift model** — org-level shift definitions (AM/PM/Overnight) with time ranges
3. **Clone location config** — copy equipment + tasks from one location to another
4. **Task Ordering** — configurable sort order per location
5. **Compliance Start Date** per location
6. **Richer user hierarchy** — Manager field, Title/Role distinction, multi-location assignment with Home Location concept
7. **App-level access control** — which modules each user can access (not just permissions within modules)
8. **CA auto-generation with re-take option** — when CA is generated, optionally require re-reading
9. **Print-friendly daily task view** — compact mode for physical posting
10. **Favorite views / saved filters** — for reports and CA listings

### Screenshots Reference
| # | File | Content |
|---|---|---|
| 01 | login-page.png | WorkPulse login (username/password/access ID) |
| 02 | dashboard.png | Home dashboard with module tiles |
| 03 | book-checklists.png | Task Dashboard — compliance grid |
| 04 | task-compliance.png | Shift Task Compliance view |
| 05 | task-progress.png | Weekly completion % table |
| 06 | daily-tasks.png | Printable daily tasks per location |
| 07 | corrective-action-book.png | CA % closed by category heatmap |
| 08 | audit-module.png | Audit My Audits — schedule view |
| 09 | audit-adhoc.png | Audit ad-hoc forms |
| 10 | audit-summary.png | Audit Summary — completed audits with scores |
| 11 | gismo-complaints.png | GiSMo complaints dashboard |
| 12 | desk-maintenance.png | Desk ticket board |
| 13 | corrective-action-listing.png | Standalone CA listing (1,786 CAs) |
| 14 | admin.png | Admin module — user management |
| 15 | team-audits.png | Audit team audits view |
| 16 | book-dashboard.png | Book Dashboard — KPIs + radial chart |
| 17 | app-settings.png | App Settings page |
| 18 | app-settings-book.png | Book-specific app settings |
| 19 | shifts.png | Shift configuration (AM/PM/Overnight) |
| 20 | mdr-management.png | MDR device registration grid |
| 21 | user-management.png | User list with hierarchy |
| 22 | user-detail.png | User detail page |
| 23 | user-detail-modal.png | User detail modal (4 sections) |
| 24 | locations.png | Location management with tabs |
| 25 | location-book-config.png | Location Book tab — equipment config |
| 26 | equipment-tasks.png | Equipment tasks expanded (Dairy Dispenser) |

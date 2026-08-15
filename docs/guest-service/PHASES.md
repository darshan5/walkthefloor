# Guest Service — Implementation Phases

> Sequenced roadmap. Each phase has clear deliverables and validation criteria.
> See [SPEC.md](./SPEC.md) for the full architecture and design decisions.

---

## Phase Summary

| Phase | Focus | Depends On | Status |
| ----- | ----- | ---------- | ------ |
| 1 | Schema + Sync Service + Config Admin | — | Not started |
| 2 | Cases Tab + Case Detail | 1 | Not started |
| 3 | Trends Tab + Charts | 1 | Not started |
| 4 | Response Flow | 2 | Not started |

```
Phase 1 ──┬── Phase 2 ──► Phase 4
schema     │   cases UI     response
+ sync     │
+ config   └── Phase 3
                trends UI
```

Phases 2 and 3 are independent — can be built in parallel after Phase 1.

---

## Phase 1 — Schema, Sync Service, Config Admin

### Deliverables

- [ ] Add `GuestServiceConfig`, `GuestSurvey`, `GuestComplaint` models to Prisma schema
- [ ] Run migration
- [ ] Service: `guest-service.ts` — sync logic, trend aggregation, complaint queries
- [ ] InboxClerk client: fetch surveys and complaints with pagination, date filtering
- [ ] Sync function: pull records, match store numbers, upsert locally, preserve responses
- [ ] Add sync cron job to `instrumentation-node.ts` (daily at 4am ET)
- [ ] API: `GET /api/v1/guest-service/config` — get sync config
- [ ] API: `POST /api/v1/guest-service/config` — save API key + enable toggle
- [ ] API: `POST /api/v1/guest-service/sync` — trigger manual sync
- [ ] Admin: Organization settings → "Guest Service" tab with API key, test connection, enable toggle, sync status, sync now button

### Tests

- [ ] Sync upserts surveys by `surveyId` (no duplicates)
- [ ] Sync upserts complaints by `caseNumber` (no duplicates)
- [ ] Existing `responseText` preserved on complaint upsert
- [ ] Unmatched store numbers logged, don't break sync
- [ ] Manual sync trigger works

### Validates

Data flows from InboxClerk → local DB. Admin can configure the connection and trigger syncs. Cron job runs on schedule.

---

## Phase 2 — Cases Tab + Case Detail

### Deliverables

- [ ] Guest Service main page (`/guest-service`) replacing placeholder
- [ ] Tabs: Cases (default) and Trends (placeholder for Phase 3)
- [ ] API: `GET /api/v1/guest-service/complaints` — list with month, locationId, responded filters
- [ ] API: `GET /api/v1/guest-service/complaints/[id]` — detail
- [ ] KPI cards: total cases, needs response, responded (for selected month)
- [ ] Case list: card layout with case number, guest name, reason, incident date, location, status badge
- [ ] Filters: month selector, location dropdown, response status
- [ ] Case detail page (`/guest-service/[complaintId]`): header, guest info, details, remediation flags
- [ ] Status badges: "Needs Response" (amber), "Responded" (green)

### Tests

- [ ] Cases filtered correctly by month, location, response status
- [ ] Detail page renders all fields
- [ ] Location scoping — RGM only sees their locations

### Validates

Users can browse and filter complaint cases. Detail page shows full case information.

---

## Phase 3 — Trends Tab + Charts

### Deliverables

- [ ] API: `GET /api/v1/guest-service/trends` — aggregated OSAT/LTR by month and location
- [ ] Trends tab on guest service page
- [ ] KPI cards: current month avg OSAT, avg LTR, survey count (with delta vs previous month)
- [ ] Line chart: OSAT and LTR over time (Recharts)
- [ ] Location selector: filter to specific location or "All Locations"
- [ ] Time range toggle: 3/6/12 months

### Tests

- [ ] Trend aggregation produces correct monthly averages
- [ ] Location filter narrows chart data
- [ ] Time range toggle adjusts data range
- [ ] Empty state when no survey data exists

### Validates

Users can see OSAT/LTR trends over time, compare months, and filter by location.

---

## Phase 4 — Response Flow

### Deliverables

- [ ] API: `POST /api/v1/guest-service/complaints/[id]/respond` — submit response (RGM+)
- [ ] Response section on case detail page:
  - Not responded: textarea + submit button
  - Responded: read-only response text, respondent name, response date
- [ ] Status badge updates after response
- [ ] KPI counts update after response
- [ ] Validation: response text is required (non-empty)

### Tests

- [ ] RGM+ can respond to complaints at their locations
- [ ] Response persists and shows as read-only after submission
- [ ] Cannot respond twice (button hidden after response)
- [ ] Sync does not overwrite existing responses

### Validates

Complete complaint lifecycle: case arrives via sync → manager reviews → writes response → case marked as responded.

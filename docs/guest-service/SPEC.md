# Guest Service — Product & Architecture Specification

> Guest feedback trends and complaint case management, powered by InboxClerk API data.

---

## 1. Overview

Module 4 of WalkTheFloor. Pulls guest survey metrics (OSAT, LTR) and complaint cases daily from InboxClerk, stores locally, and surfaces trends and actionable complaints. Store managers must respond to every complaint case — it's an accountability record.

Two data streams from InboxClerk:
- **Survey metrics** (`dunkinguestfeedbackextractor`) — individual survey responses with OSAT/LTR scores per store
- **Complaint cases** (`dbi-guest-complaint-cases`) — serious guest complaints requiring a manager response

---

## 2. Users & Access

| Action | Minimum Role | Permission Key |
|--------|-------------|----------------|
| View trends + cases | RGM | `guest_service.view` |
| Respond to complaints | RGM | `guest_service.manage` |
| Configure InboxClerk connection | Director | `admin.org` |

Location scoping: RGM+ sees data for any location in their `locationIds`. Responses can be written by any RGM+ with access to that location.

---

## 3. Data Source — InboxClerk API

### Connection

- **Base URL**: `https://inboxclerk.com/api/data/{slug}`
- **Auth**: `X-API-Key` header
- **Models**: `dunkinguestfeedbackextractor` (surveys), `dbi-guest-complaint-cases` (complaints)
- **Pagination**: `page` + `limit` (max 100 per page)
- **Filtering**: `POST /api/data/{slug}/query` with `dateFrom`/`dateTo` and field filters

### Location Mapping

- Survey: `restaurant_id` → Location's `storeNumber`
- Complaints: `pc_number` → Location's `storeNumber`

---

## 4. Data Model

### GuestServiceConfig (per organization)

Stored in existing `OrganizationSettings` JSON or as a new model:

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| organizationId | FK → Organization | Unique |
| inboxClerkApiKey | String | Encrypted API key |
| isEnabled | Boolean | Enable/disable daily sync |
| lastSyncAt | DateTime? | Last successful sync timestamp |
| lastSyncError | String? | Last sync error message |

### GuestSurvey

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| surveyId | String | Unique — from InboxClerk `survey_id` |
| locationId | FK → Location | Mapped via `storeNumber` |
| organizationId | FK → Organization | |
| reportDate | DateTime | |
| transactionDate | DateTime | |
| responseDate | DateTime | |
| osatScore | Float? | 1-5 or percentage scale |
| ltrScore | Float? | 1-5 or percentage scale |
| accuracy | String? | |
| offeredSample | Boolean? | |
| guestComment | String? | |
| surveyUrl | String? | |
| restaurantAddress | String? | |
| inboxClerkRecordId | String | Original record ID for dedup |
| createdAt | DateTime | When synced |

Unique constraint: `surveyId` (upsert by this).

### GuestComplaint

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| caseNumber | String | Unique — from InboxClerk `case_number` |
| locationId | FK → Location | Mapped via `storeNumber` |
| organizationId | FK → Organization | |
| contactReceivedDate | DateTime? | |
| incidentDate | DateTime? | |
| incidentHour | String? | |
| reasonForContact | String | |
| caseOrigin | String? | |
| guestName | String | |
| guestEmail | String? | |
| guestPhone | String? | |
| restaurantAddress | String? | |
| restaurantCity | String? | |
| restaurantState | String? | |
| productInvolved | String? | |
| visitType | String? | |
| loyaltyPointsAdded | String? | YES/NO |
| moneyOrGiftCardSent | String? | YES/NO |
| nextItemCouponSent | String? | YES/NO |
| guestNotes | String? | |
| franchiseOwner | String? | |
| comments | String? | From InboxClerk |
| responseText | String? | Manager's response (local) |
| respondedById | FK → User? | Who responded |
| respondedAt | DateTime? | When responded |
| inboxClerkRecordId | String | Original record ID |
| createdAt | DateTime | When synced |

Unique constraint: `caseNumber` (upsert by this).

---

## 5. Daily Sync

### Implementation

Add to `instrumentation-node.ts` using existing `node-cron` pattern. Runs daily (e.g. `0 4 * * *` — 4am ET).

### Sync Flow

1. Load `GuestServiceConfig` for each org with `isEnabled = true`
2. For each org:
   a. Query InboxClerk `dunkinguestfeedbackextractor` with `dateFrom` = last sync date
   b. For each record, match `restaurant_id` to a Location's `storeNumber`
   c. Upsert `GuestSurvey` by `surveyId`
   d. Query InboxClerk `dbi-guest-complaint-cases` with `dateFrom` = last sync date
   e. For each record, match `pc_number` to a Location's `storeNumber`
   f. Upsert `GuestComplaint` by `caseNumber` (preserve existing `responseText` on upsert)
   g. Update `lastSyncAt` on success, `lastSyncError` on failure
3. Log results: records synced, matched, unmatched store numbers

### Edge Cases

- Unmatched store numbers: log warning, skip record (don't fail sync)
- InboxClerk API down: log error, retry next cycle
- Preserve local `responseText`/`respondedById`/`respondedAt` on complaint upsert — never overwrite manager responses

---

## 6. API Design

### Guest Service

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/guest-service/trends` | Survey trend data (OSAT/LTR aggregates by month/location) | RGM+ |
| GET | `/api/v1/guest-service/complaints` | List complaints (filters: month, locationId, responded) | RGM+ |
| GET | `/api/v1/guest-service/complaints/[id]` | Complaint detail | RGM+ |
| POST | `/api/v1/guest-service/complaints/[id]/respond` | Submit response | RGM+ |
| GET | `/api/v1/guest-service/config` | Get sync config (admin) | Director+ |
| POST | `/api/v1/guest-service/config` | Save sync config (API key, enable/disable) | Director+ |
| POST | `/api/v1/guest-service/sync` | Trigger manual sync | Director+ |

### Trends — Response Shape

```json
{
  "summary": {
    "currentMonth": { "avgOsat": 4.2, "avgLtr": 4.5, "surveyCount": 87 },
    "previousMonth": { "avgOsat": 4.0, "avgLtr": 4.3, "surveyCount": 92 }
  },
  "monthly": [
    { "month": "2026-08", "avgOsat": 4.2, "avgLtr": 4.5, "count": 87 },
    { "month": "2026-07", "avgOsat": 4.0, "avgLtr": 4.3, "count": 92 }
  ],
  "byLocation": [
    { "locationId": "...", "locationName": "Store #1234", "avgOsat": 4.3, "avgLtr": 4.6, "count": 45 }
  ]
}
```

### Respond — Request Body

```json
{
  "responseText": "Spoke with the guest, issued a replacement and coupon. Retraining staff on order accuracy."
}
```

---

## 7. UI/UX

### 7.1 Main Guest Service Page (`/guest-service`)

Two tabs: **Cases** (default) and **Trends**.

### 7.2 Cases Tab

- **Filters**: Month selector (current + previous months), location dropdown, response status (All / Needs Response / Responded)
- **KPI cards**: Total cases this month, needs response count, responded count
- **Case list**: Card layout, each showing:
  - Case number
  - Guest name
  - Reason for contact
  - Incident date
  - Location name
  - Status badge: "Needs Response" (amber) or "Responded" (green)
- Click opens detail page

### 7.3 Case Detail Page (`/guest-service/[complaintId]`)

Full page:

- **Header**: Case number, status badge, location name, incident date
- **Guest Info section**: Name, email, phone, visit type, incident hour
- **Details section**: Reason for contact, product involved, case origin, guest notes, comments
- **Remediation section**: Loyalty points added, money/gift card sent, coupon sent (YES/NO badges)
- **Response section**:
  - If not responded: textarea + submit button. Required.
  - If responded: shows response text, responded by name, responded date. Read-only.

### 7.4 Trends Tab

- **KPI cards**: Current month avg OSAT, avg LTR, survey count (with delta vs previous month)
- **Line chart**: OSAT and LTR over time (monthly data points)
- **Location selector**: Filter chart to specific location or "All Locations"
- **Time range**: Last 3/6/12 months toggle

### 7.5 Admin → Organization Settings → Guest Service Tab

- InboxClerk API Key (password input, stored encrypted)
- Test Connection button (calls InboxClerk API, shows success/fail)
- Enable/Disable toggle for daily sync
- Last sync timestamp + status
- "Sync Now" button for manual trigger

---

## 8. Scope Boundaries

**In v1:**
- InboxClerk API connection config in admin settings
- Daily sync of surveys and complaints
- Manual sync trigger
- Survey trend dashboard (OSAT/LTR charts, KPIs)
- Complaint case list with month/location/response filters
- Complaint detail with manager response (stored locally)
- Location mapping via storeNumber

**Deferred:**
- Pushing responses back to InboxClerk
- Individual survey detail views
- Notifications on new complaints
- Accuracy/offered_sample trend analysis
- Export/download of trend data
- Comparison views (location vs location)

# WalkTheFloor QA Test Plan

Definitive QA reference for the WalkTheFloor restaurant operations platform.
Covers every API endpoint (runnable curl commands) and every user-facing flow (Playwright E2E specs).

---

## Variables

Set these before running any tests:

```bash
export BASE_URL="http://localhost:3000"
export SETUP_TOKEN="your-setup-bearer-token"

# Populated during test run:
export TOKEN=""           # Tenant user JWT (email/password login)
export PIN_TOKEN=""       # Tenant user JWT (PIN login)
export SAAS_TOKEN=""      # SaaS admin JWT
export API_KEY=""         # API key for /api/v1/* Bearer auth

export ORG_ID=""
export ORG_SLUG=""
export LOCATION_ID=""
export LOCATION_STORE_NUMBER=""
export USER_ID=""
export ROLE_ID=""
export SHIFT_ID=""
export EQUIPMENT_TYPE_ID=""
export LOCATION_EQUIPMENT_ID=""
export TEMPLATE_ID=""
export INSTANCE_ID=""
export TASK_ID=""
export COMPLETION_ID=""
export CA_ID=""
export FAILURE_ID=""
export TEMP_LOG_ID=""
export TICKET_ID=""
export PLAN_ID=""
export SUBSCRIPTION_ID=""
export NOTIFICATION_ID=""
export DEVICE_TOKEN=""
```

---

# Section 1: API Tests (curl)

Every command below is designed to be run sequentially. IDs from earlier responses must be captured into the corresponding variables before running subsequent steps.

---

## Step 1 — Health & Setup

### 1.1 Health Check

```bash
curl -s "$BASE_URL/api/health" | jq .
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-20T...",
  "database": "connected"
}
```

### 1.2 Setup (Migrate + Seed)

```bash
curl -s -X POST "$BASE_URL/api/setup" \
  -H "Authorization: Bearer $SETUP_TOKEN" | jq .
```

**Expected:**
```json
{
  "success": true,
  "migrations": "applied",
  "seed": "completed"
}
```

### 1.3 Setup without auth (should fail)

```bash
curl -s -X POST "$BASE_URL/api/setup" | jq .
```

**Expected:** `401 Unauthorized`

### 1.4 Setup with wrong token

```bash
curl -s -X POST "$BASE_URL/api/setup" \
  -H "Authorization: Bearer wrong-token" | jq .
```

**Expected:** `401 Unauthorized`

---

## Step 2 — Authentication

### 2.1 Tenant Login (email/password)

```bash
curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rgm@demo-org.com",
    "password": "password123"
  }' | jq .
```

> Note: NextAuth v5 handles auth through its own callback routes. For API-style testing, use the CSRF + signin flow or call the NextAuth session endpoint after browser-based login.

**Alternative — Direct session fetch after login:**

```bash
# Sign in via NextAuth (follow redirects to get session cookie)
curl -s -c cookies.txt -L -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=rgm@demo-org.com&password=password123&csrfToken=$(curl -s -c cookies.txt -b cookies.txt "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')"

# Fetch session (extract JWT token from session)
curl -s -b cookies.txt "$BASE_URL/api/auth/session" | jq .
```

**Expected session shape:**
```json
{
  "user": {
    "id": "clxxx...",
    "email": "rgm@demo-org.com",
    "name": "Demo RGM",
    "organizationId": "clxxx...",
    "roleId": "clxxx...",
    "role": { "name": "RGM", "permissions": [...] },
    "homeLocationId": "clxxx...",
    "userType": "full"
  },
  "expires": "..."
}
```

> After login, extract the `next-auth.session-token` cookie or JWT for subsequent requests.
> For simplicity in this plan, we assume a helper that extracts the token:

```bash
export TOKEN="<extracted-jwt-or-session-token>"
export ORG_ID="<from-session.user.organizationId>"
export LOCATION_ID="<from-session.user.homeLocationId>"
```

### 2.2 SaaS Admin Login

```bash
curl -s -c saas-cookies.txt -L -X POST "$BASE_URL/api/auth/callback/saas-admin" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@walkthefloor.com&password=admin-password&csrfToken=$(curl -s -c saas-cookies.txt -b saas-cookies.txt "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')"

curl -s -b saas-cookies.txt "$BASE_URL/api/auth/session" | jq .
```

**Expected session shape:**
```json
{
  "user": {
    "saasAdminId": "clxxx...",
    "email": "admin@walkthefloor.com",
    "name": "Platform Admin",
    "saasRole": "SUPER_ADMIN"
  },
  "expires": "..."
}
```

```bash
export SAAS_TOKEN="<extracted-jwt>"
```

### 2.3 PIN Login (device-based)

```bash
curl -s -c pin-cookies.txt -L -X POST "$BASE_URL/api/auth/callback/pin" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "pin=1234&deviceToken=$DEVICE_TOKEN&csrfToken=$(curl -s -c pin-cookies.txt -b pin-cookies.txt "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')"

curl -s -b pin-cookies.txt "$BASE_URL/api/auth/session" | jq .
```

**Expected session shape:**
```json
{
  "user": {
    "id": "clxxx...",
    "name": "Team Member",
    "organizationId": "clxxx...",
    "roleId": "clxxx...",
    "role": { "name": "Team Member", "permissions": [...] },
    "homeLocationId": "clxxx...",
    "userType": "pin_only"
  },
  "expires": "..."
}
```

### 2.4 Invalid credentials

```bash
curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=rgm@demo-org.com&password=wrongpassword&csrfToken=xxx"
```

**Expected:** Redirect to `/login?error=CredentialsSignin` (no session created)

### 2.5 Inactive user login

```bash
curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=deactivated@demo-org.com&password=password123&csrfToken=xxx"
```

**Expected:** Redirect to `/login?error=CredentialsSignin` (inactive users cannot log in)

---

## Step 3 — Equipment Types

### 3.1 List Equipment Types

```bash
curl -s "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "equipmentTypes": [
    {
      "id": "clxxx...",
      "name": "Walk-in Freezer",
      "category": "Refrigeration",
      "organizationId": "clxxx...",
      "_count": { "locationEquipment": 3, "checklistTasks": 5 }
    }
  ]
}
```

### 3.2 Create Equipment Type

```bash
curl -s -X POST "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prep Table Cooler",
    "category": "Refrigeration"
  }' | jq .
```

**Expected:**
```json
{
  "equipmentType": {
    "id": "clxxx...",
    "name": "Prep Table Cooler",
    "category": "Refrigeration",
    "organizationId": "clxxx..."
  }
}
```

```bash
export EQUIPMENT_TYPE_ID="<from-response.equipmentType.id>"
```

### 3.3 Get Single Equipment Type

```bash
curl -s "$BASE_URL/api/v1/equipment-types/$EQUIPMENT_TYPE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 3.4 Update Equipment Type

```bash
curl -s -X PATCH "$BASE_URL/api/v1/equipment-types/$EQUIPMENT_TYPE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prep Table Cooler (Updated)",
    "category": "Cold Storage"
  }' | jq .
```

### 3.5 Delete Equipment Type

```bash
curl -s -X DELETE "$BASE_URL/api/v1/equipment-types/$EQUIPMENT_TYPE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200 OK` with `{ "success": true }`

### 3.6 Create duplicate name (should fail)

```bash
curl -s -X POST "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Walk-in Freezer",
    "category": "Refrigeration"
  }' | jq .
```

**Expected:** `409 Conflict` — equipment type name must be unique per org

---

## Step 4 — Shifts

### 4.1 List Shifts

```bash
curl -s "$BASE_URL/api/v1/shifts" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "shifts": [
    { "id": "clxxx...", "name": "AM", "startTime": "05:00", "endTime": "13:00" },
    { "id": "clxxx...", "name": "PM", "startTime": "13:00", "endTime": "21:00" },
    { "id": "clxxx...", "name": "Overnight", "startTime": "21:00", "endTime": "05:00" }
  ]
}
```

### 4.2 Create Shift

```bash
curl -s -X POST "$BASE_URL/api/v1/shifts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mid",
    "startTime": "10:00",
    "endTime": "18:00"
  }' | jq .
```

```bash
export SHIFT_ID="<from-response.shift.id>"
```

### 4.3 Update Shift

```bash
curl -s -X PATCH "$BASE_URL/api/v1/shifts/$SHIFT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mid-Day",
    "startTime": "10:00",
    "endTime": "18:00"
  }' | jq .
```

### 4.4 Delete Shift

```bash
curl -s -X DELETE "$BASE_URL/api/v1/shifts/$SHIFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 4.5 Create duplicate shift name (should fail)

```bash
curl -s -X POST "$BASE_URL/api/v1/shifts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AM",
    "startTime": "06:00",
    "endTime": "14:00"
  }' | jq .
```

**Expected:** `409 Conflict` — shift name must be unique per org

---

## Step 5 — Locations

### 5.1 List Locations

```bash
curl -s "$BASE_URL/api/v1/locations" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "locations": [
    {
      "id": "clxxx...",
      "name": "Store #101",
      "storeNumber": "101",
      "address": "123 Main St, Springfield",
      "timezone": "America/New_York",
      "isActive": true,
      "_count": { "userLocations": 5, "locationEquipment": 12 }
    }
  ]
}
```

### 5.2 Create Location

```bash
curl -s -X POST "$BASE_URL/api/v1/locations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Store #999",
    "storeNumber": "999",
    "address": "456 Oak Ave, Springfield",
    "timezone": "America/Chicago",
    "operatingHours": {
      "mon": { "open": "05:00", "close": "23:00" },
      "tue": { "open": "05:00", "close": "23:00" },
      "wed": { "open": "05:00", "close": "23:00" },
      "thu": { "open": "05:00", "close": "23:00" },
      "fri": { "open": "05:00", "close": "00:00" },
      "sat": { "open": "06:00", "close": "00:00" },
      "sun": { "open": "06:00", "close": "22:00" }
    }
  }' | jq .
```

```bash
export LOCATION_ID="<from-response.location.id>"
export LOCATION_STORE_NUMBER="999"
```

### 5.3 Get Single Location

```bash
curl -s "$BASE_URL/api/v1/locations/$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 5.4 Update Location

```bash
curl -s -X PATCH "$BASE_URL/api/v1/locations/$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Store #999 (Renovated)",
    "geoFenceRadius": 150,
    "latitude": 39.7817,
    "longitude": -89.6501
  }' | jq .
```

### 5.5 Configure Book (assign equipment to location)

```bash
curl -s -X POST "$BASE_URL/api/v1/locations/$LOCATION_ID/equipment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentTypeId": "'"$EQUIPMENT_TYPE_ID"'",
    "instanceName": "Prep Table Cooler 1",
    "sortOrder": 0
  }' | jq .
```

```bash
export LOCATION_EQUIPMENT_ID="<from-response.locationEquipment.id>"
```

### 5.6 List Equipment at Location

```bash
curl -s "$BASE_URL/api/v1/locations/$LOCATION_ID/equipment" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "equipment": [
    {
      "id": "clxxx...",
      "instanceName": "Prep Table Cooler 1",
      "equipmentType": { "id": "clxxx...", "name": "Prep Table Cooler", "category": "Refrigeration" },
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

### 5.7 Configure Location Template (assign checklist + override windows)

```bash
curl -s -X POST "$BASE_URL/api/v1/locations/$LOCATION_ID/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "'"$TEMPLATE_ID"'",
    "windowOverrides": [
      { "start": "06:00", "end": "10:00", "label": "AM" },
      { "start": "14:00", "end": "18:00", "label": "PM" }
    ]
  }' | jq .
```

### 5.8 Delete Location

```bash
curl -s -X DELETE "$BASE_URL/api/v1/locations/$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `200 OK` with `{ "success": true }` (cascade deletes all child records)

---

## Step 6 — Checklist Templates

### 6.1 List Templates

```bash
curl -s "$BASE_URL/api/v1/checklists" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "templates": [
    {
      "id": "clxxx...",
      "name": "Book Logs",
      "category": "Book Logs",
      "isBuiltIn": true,
      "isCustom": false,
      "schedule": { "frequency": "every_12h", "windows": [...] },
      "isActive": true,
      "version": 1,
      "_count": { "tasks": 15, "instances": 42 }
    }
  ]
}
```

### 6.2 Create Custom Template

```bash
curl -s -X POST "$BASE_URL/api/v1/checklists" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Deep Clean",
    "description": "Weekly deep cleaning checklist for all areas",
    "category": "Custom",
    "isCustom": true,
    "schedule": {
      "frequency": "weekly",
      "days": ["mon"],
      "windows": [{ "start": "05:00", "end": "23:00" }]
    },
    "tasks": [
      {
        "title": "Deep clean fryer",
        "taskType": "YES_NO",
        "config": { "expectedAnswer": "yes" },
        "sortOrder": 0,
        "isRequired": true,
        "isCritical": false
      },
      {
        "title": "Hood vent temperature",
        "taskType": "TEMPERATURE",
        "config": { "min": 100, "max": 200, "target": 150, "unit": "F" },
        "sortOrder": 1,
        "isRequired": true,
        "isCritical": true,
        "requiresPhoto": true
      },
      {
        "title": "Condition of floor mats",
        "taskType": "SELECT",
        "config": { "choices": ["Good", "Fair", "Replace"] },
        "sortOrder": 2,
        "isRequired": true
      }
    ]
  }' | jq .
```

```bash
export TEMPLATE_ID="<from-response.template.id>"
```

### 6.3 Get Template with Tasks

```bash
curl -s "$BASE_URL/api/v1/checklists/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** Full template object with `tasks[]` array included.

### 6.4 Update Template

```bash
curl -s -X PATCH "$BASE_URL/api/v1/checklists/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Deep Clean (v2)",
    "description": "Updated weekly deep cleaning checklist"
  }' | jq .
```

### 6.5 List Built-in Templates Only

```bash
curl -s "$BASE_URL/api/v1/checklists?isBuiltIn=true" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** Only templates where `isBuiltIn === true` (Book Logs, Opening, Closing, Food Safety Assessment).

### 6.6 Delete Custom Template

```bash
curl -s -X DELETE "$BASE_URL/api/v1/checklists/$TEMPLATE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 6.7 Delete built-in template (should fail)

```bash
curl -s -X DELETE "$BASE_URL/api/v1/checklists/<built-in-template-id>" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `403 Forbidden` or `400 Bad Request` — built-in templates cannot be deleted.

---

## Step 7 — Checklist Instances

### 7.1 Get Today's Instances (for current location)

```bash
curl -s "$BASE_URL/api/v1/instances?locationId=$LOCATION_ID&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "instances": [
    {
      "id": "clxxx...",
      "templateId": "clxxx...",
      "template": { "name": "Book Logs", "category": "Book Logs" },
      "locationId": "clxxx...",
      "date": "2026-05-20",
      "windowLabel": "AM",
      "windowStart": "2026-05-20T05:00:00.000Z",
      "windowEnd": "2026-05-20T11:00:00.000Z",
      "status": "PENDING",
      "isCompliant": null,
      "completedAt": null,
      "_count": { "completions": 0 },
      "_taskCount": 15
    }
  ]
}
```

### 7.2 Get Single Instance with Completions

```bash
export INSTANCE_ID="<from-previous-response>"

curl -s "$BASE_URL/api/v1/instances/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** Instance with nested `template.tasks[]` and any existing `completions[]`.

### 7.3 Get Instances by Status

```bash
curl -s "$BASE_URL/api/v1/instances?locationId=$LOCATION_ID&status=MISSED" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 7.4 Get Instances for Date Range

```bash
curl -s "$BASE_URL/api/v1/instances?locationId=$LOCATION_ID&from=2026-05-01&to=2026-05-20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Step 8 — Task Completions

### 8.1 Submit Task Completion (auto-save pattern)

Each task is saved individually as the user fills it in. The frontend does NOT submit the entire checklist at once.

**Compliant YES_NO task:**

```bash
export TASK_ID="<id-of-a-YES_NO-task-from-template>"

curl -s -X POST "$BASE_URL/api/v1/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "'"$INSTANCE_ID"'",
    "taskId": "'"$TASK_ID"'",
    "value": { "answer": true },
    "isCompliant": true,
    "notes": null
  }' | jq .
```

**Expected:**
```json
{
  "completion": {
    "id": "clxxx...",
    "instanceId": "clxxx...",
    "taskId": "clxxx...",
    "userId": "clxxx...",
    "value": { "answer": true },
    "isCompliant": true,
    "completedAt": "2026-05-20T..."
  }
}
```

```bash
export COMPLETION_ID="<from-response.completion.id>"
```

### 8.2 Submit Non-Compliant Temperature Reading (triggers CA auto-creation)

```bash
export TEMP_TASK_ID="<id-of-a-TEMPERATURE-task>"

curl -s -X POST "$BASE_URL/api/v1/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "'"$INSTANCE_ID"'",
    "taskId": "'"$TEMP_TASK_ID"'",
    "locationEquipmentId": "'"$LOCATION_EQUIPMENT_ID"'",
    "value": { "temp": 38.5 },
    "isCompliant": false,
    "notes": "Freezer door was left open"
  }' | jq .
```

**Expected:** Completion created with `isCompliant: false`. A CorrectiveAction is auto-created in the background.

```json
{
  "completion": {
    "id": "clxxx...",
    "isCompliant": false,
    "value": { "temp": 38.5 },
    "correctiveAction": {
      "id": "clxxx...",
      "title": "Non-compliant temperature: Walk-in Freezer 1",
      "status": "OPEN",
      "priority": "HIGH",
      "actualValue": "38.5 °F",
      "targetValue": "-5 °F",
      "validRange": "-10.0°F to 0.0°F"
    }
  }
}
```

### 8.3 Submit Completion with Photo

```bash
curl -s -X POST "$BASE_URL/api/v1/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "'"$INSTANCE_ID"'",
    "taskId": "'"$TASK_ID"'",
    "value": { "answer": true },
    "isCompliant": true,
    "photoUrls": ["https://r2.walkthefloor.com/photos/abc123.jpg"]
  }' | jq .
```

### 8.4 Update Existing Completion (re-submit same task)

```bash
curl -s -X PATCH "$BASE_URL/api/v1/completions/$COMPLETION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": { "answer": false },
    "isCompliant": false,
    "notes": "Correction: actually found issue"
  }' | jq .
```

### 8.5 Verify Instance Status Transitions

After submitting all completions for an instance, verify it moves to COMPLETED:

```bash
curl -s "$BASE_URL/api/v1/instances/$INSTANCE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{ status, isCompliant, completedAt }'
```

**Expected when all tasks completed:**
```json
{
  "status": "COMPLETED",
  "isCompliant": true,
  "completedAt": "2026-05-20T..."
}
```

---

## Step 9 — Corrective Actions

### 9.1 List Corrective Actions (All)

```bash
curl -s "$BASE_URL/api/v1/corrective-actions?locationId=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "correctiveActions": [
    {
      "id": "clxxx...",
      "title": "Non-compliant temperature: Walk-in Freezer 1",
      "description": null,
      "priority": "HIGH",
      "status": "OPEN",
      "dueDate": "2026-05-22T...",
      "location": { "id": "clxxx...", "name": "Store #101" },
      "assignee": { "id": "clxxx...", "name": "Demo RGM" },
      "createdBy": { "id": "clxxx...", "name": "Demo RGM" },
      "actualValue": "38.5 °F",
      "targetValue": "-5 °F",
      "validRange": "-10.0°F to 0.0°F",
      "_count": { "comments": 0 },
      "createdAt": "2026-05-20T..."
    }
  ],
  "total": 1
}
```

### 9.2 List My Corrective Actions

```bash
curl -s "$BASE_URL/api/v1/corrective-actions?assigneeId=$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 9.3 Filter by Status

```bash
curl -s "$BASE_URL/api/v1/corrective-actions?locationId=$LOCATION_ID&status=OPEN" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 9.4 Get Single CA with Comments

```bash
export CA_ID="<from-previous-response>"

curl -s "$BASE_URL/api/v1/corrective-actions/$CA_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 9.5 Update CA Status (OPEN -> IN_PROGRESS)

```bash
curl -s -X PATCH "$BASE_URL/api/v1/corrective-actions/$CA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }' | jq .
```

### 9.6 Add Comment to CA

```bash
curl -s -X POST "$BASE_URL/api/v1/corrective-actions/$CA_ID/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Adjusted thermostat and monitoring temperature. Will re-check in 2 hours."
  }' | jq .
```

**Expected:**
```json
{
  "comment": {
    "id": "clxxx...",
    "correctiveActionId": "clxxx...",
    "userId": "clxxx...",
    "content": "Adjusted thermostat and monitoring temperature. Will re-check in 2 hours.",
    "statusChange": null,
    "createdAt": "2026-05-20T..."
  }
}
```

### 9.7 Resolve CA

```bash
curl -s -X PATCH "$BASE_URL/api/v1/corrective-actions/$CA_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESOLVED",
    "resolvedNotes": "Temperature returned to normal range after thermostat adjustment."
  }' | jq .
```

### 9.8 Add Comment with Status Change

```bash
curl -s -X POST "$BASE_URL/api/v1/corrective-actions/$CA_ID/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Verified temperature at -4°F, within range.",
    "statusChange": "IN_PROGRESS -> RESOLVED"
  }' | jq .
```

---

## Step 10 — Compliance Failures

### 10.1 List Compliance Failures

```bash
curl -s "$BASE_URL/api/v1/compliance-failures?locationId=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "failures": [
    {
      "id": "clxxx...",
      "instanceId": "clxxx...",
      "instance": { "date": "2026-05-19", "template": { "name": "Book Logs" } },
      "templateId": "clxxx...",
      "locationId": "clxxx...",
      "windowLabel": "PM",
      "status": "unexcused",
      "explanation": null,
      "createdAt": "2026-05-19T..."
    }
  ]
}
```

### 10.2 Filter Failures by Status

```bash
curl -s "$BASE_URL/api/v1/compliance-failures?locationId=$LOCATION_ID&status=unexcused" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 10.3 Submit Explanation (RGM)

```bash
export FAILURE_ID="<from-previous-response>"

curl -s -X POST "$BASE_URL/api/v1/compliance-failures/$FAILURE_ID/explanation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "explanation": "Store experienced a power outage from 2pm-6pm. Electrical company was on-site for repairs."
  }' | jq .
```

**Expected:**
```json
{
  "failure": {
    "id": "clxxx...",
    "explanation": "Store experienced a power outage from 2pm-6pm...",
    "explainedAt": "2026-05-20T...",
    "explainedById": "clxxx...",
    "status": "pending_review"
  }
}
```

### 10.4 Approve Explanation (Multi-unit Manager+)

Login as Multi-unit Manager first, then:

```bash
curl -s -X PATCH "$BASE_URL/api/v1/compliance-failures/$FAILURE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "excused",
    "reviewNotes": "Confirmed power outage with utility records."
  }' | jq .
```

**Expected:**
```json
{
  "failure": {
    "id": "clxxx...",
    "status": "excused",
    "reviewedById": "clxxx...",
    "reviewedAt": "2026-05-20T...",
    "reviewNotes": "Confirmed power outage with utility records."
  }
}
```

### 10.5 Deny Explanation

```bash
curl -s -X PATCH "$BASE_URL/api/v1/compliance-failures/$FAILURE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "denied",
    "reviewNotes": "Store was operational during the stated period."
  }' | jq .
```

---

## Step 11 — Temperature Logs

### 11.1 Submit Temperature Reading

```bash
curl -s -X POST "$BASE_URL/api/v1/temperature-logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "'"$LOCATION_ID"'",
    "equipmentName": "Walk-in Cooler",
    "temperature": 36.2,
    "unit": "F",
    "isCompliant": true,
    "source": "manual",
    "notes": "Routine check"
  }' | jq .
```

**Expected:**
```json
{
  "temperatureLog": {
    "id": "clxxx...",
    "locationId": "clxxx...",
    "userId": "clxxx...",
    "equipmentName": "Walk-in Cooler",
    "temperature": 36.2,
    "unit": "F",
    "isCompliant": true,
    "source": "manual",
    "recordedAt": "2026-05-20T..."
  }
}
```

```bash
export TEMP_LOG_ID="<from-response.temperatureLog.id>"
```

### 11.2 List Temperature Logs

```bash
curl -s "$BASE_URL/api/v1/temperature-logs?locationId=$LOCATION_ID&from=$(date +%Y-%m-%d)&to=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 11.3 Submit Non-Compliant Temperature

```bash
curl -s -X POST "$BASE_URL/api/v1/temperature-logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "'"$LOCATION_ID"'",
    "equipmentName": "Prep Table Cooler",
    "temperature": 55.0,
    "unit": "F",
    "isCompliant": false,
    "source": "manual",
    "notes": "Above safe range"
  }' | jq .
```

### 11.4 Filter Logs by Compliance

```bash
curl -s "$BASE_URL/api/v1/temperature-logs?locationId=$LOCATION_ID&isCompliant=false" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Step 12 — Users

### 12.1 List Users

```bash
curl -s "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "users": [
    {
      "id": "clxxx...",
      "email": "rgm@demo-org.com",
      "name": "Demo RGM",
      "title": "Restaurant General Manager",
      "userType": "full",
      "isActive": true,
      "role": { "id": "clxxx...", "name": "RGM" },
      "homeLocation": { "id": "clxxx...", "name": "Store #101" },
      "manager": { "id": "clxxx...", "name": "Demo Multi-unit Manager" },
      "_count": { "directReports": 3 }
    }
  ]
}
```

### 12.2 Create User (email/password)

```bash
curl -s -X POST "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@demo-org.com",
    "password": "SecurePass123!",
    "name": "New Team Member",
    "title": "Crew Member",
    "userType": "full",
    "roleId": "'"$ROLE_ID"'",
    "homeLocationId": "'"$LOCATION_ID"'",
    "managerId": "'"$USER_ID"'",
    "appAccess": ["checklists"]
  }' | jq .
```

```bash
export NEW_USER_ID="<from-response.user.id>"
```

### 12.3 Create PIN-only User

```bash
curl -s -X POST "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "5678",
    "name": "PIN User",
    "title": "Crew Member",
    "userType": "pin_only",
    "roleId": "'"$ROLE_ID"'",
    "homeLocationId": "'"$LOCATION_ID"'"
  }' | jq .
```

### 12.4 Get User with Hierarchy

```bash
curl -s "$BASE_URL/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** User object with `manager`, `directReports[]`, `userLocations[]`.

### 12.5 Update User

```bash
curl -s -X PATCH "$BASE_URL/api/v1/users/$NEW_USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Shift Leader",
    "appAccess": ["checklists", "reports"]
  }' | jq .
```

### 12.6 Deactivate User

```bash
curl -s -X PATCH "$BASE_URL/api/v1/users/$NEW_USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }' | jq .
```

### 12.7 Assign User to Additional Locations

```bash
curl -s -X POST "$BASE_URL/api/v1/users/$NEW_USER_ID/locations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locationIds": ["'"$LOCATION_ID"'"]
  }' | jq .
```

### 12.8 Revoke Device Sessions

```bash
curl -s -X POST "$BASE_URL/api/v1/devices/$DEVICE_TOKEN/revoke" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "success": true,
  "device": { "id": "clxxx...", "name": "Front Counter iPad", "isActive": false }
}
```

### 12.9 List Roles

```bash
curl -s "$BASE_URL/api/v1/roles" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** Array of roles with names like Franchisee, Director, Multi-unit Manager, RGM, Team Member.

---

## Step 13 — Reports & Dashboard

### 13.1 Compliance Dashboard Data

```bash
curl -s "$BASE_URL/api/v1/reports/compliance?locationId=$LOCATION_ID&from=2026-05-01&to=2026-05-20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "compliance": {
    "overallPercentage": 92.5,
    "totalInstances": 120,
    "completedOnTime": 111,
    "completedLate": 4,
    "missed": 5,
    "byCategory": [
      { "category": "Book Logs", "percentage": 95.0, "total": 60, "compliant": 57 },
      { "category": "Opening", "percentage": 90.0, "total": 30, "compliant": 27 }
    ],
    "trend": [
      { "date": "2026-05-01", "percentage": 90.0 },
      { "date": "2026-05-02", "percentage": 93.3 }
    ]
  }
}
```

### 13.2 Checklist Adherence Grid (Multi-location)

```bash
curl -s "$BASE_URL/api/v1/reports/adherence?from=2026-05-01&to=2026-05-20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "adherence": {
    "grid": [
      {
        "location": { "id": "clxxx...", "name": "Store #101", "storeNumber": "101" },
        "checklists": [
          {
            "templateId": "clxxx...",
            "templateName": "Book Logs",
            "completedCount": 28,
            "totalCount": 30,
            "percentage": 93.3,
            "failureCount": 2
          }
        ],
        "overallPercentage": 92.5
      }
    ]
  }
}
```

### 13.3 Sales Summary (from webhook data)

```bash
curl -s "$BASE_URL/api/v1/reports/sales?locationId=$LOCATION_ID&from=2026-05-01&to=2026-05-20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "sales": {
    "totalRevenue": 125000.00,
    "totalTransactions": 4200,
    "averageCheck": 29.76,
    "dailyData": [
      { "date": "2026-05-01", "totalAmount": 6500.00, "transactionCount": 220, "checkAverage": 29.55 }
    ],
    "channelSplit": {
      "dine_in": 75000.00,
      "drive_thru": 35000.00,
      "delivery": 15000.00
    }
  }
}
```

### 13.4 CA Dashboard Stats

```bash
curl -s "$BASE_URL/api/v1/reports/corrective-actions?locationId=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "stats": {
    "open": 3,
    "inProgress": 2,
    "resolved": 15,
    "overdue": 1,
    "avgResolutionHours": 18.5,
    "byPriority": { "LOW": 2, "MEDIUM": 8, "HIGH": 7, "CRITICAL": 3 }
  }
}
```

---

## Step 14 — Webhooks (Inbound)

### Standard Webhook Payload Specifications

External systems (POS, email platforms, review aggregators) must POST payloads conforming to these schemas. The orgSlug in the URL identifies the tenant; the channel identifies the data type.

#### Complaints Payload Spec

**Endpoint:** `POST /api/webhooks/{orgSlug}/complaints`

```json
{
  "guestName": "Jane Smith",
  "guestEmail": "jane.smith@email.com",
  "guestPhone": "+15551234567",
  "subject": "Cold food and slow service",
  "description": "Ordered a burger combo at 12:15pm, received at 12:45pm. Burger was cold and fries were soggy. Drive-thru experience.",
  "source": "pos",
  "locationStoreNumber": "101",
  "externalId": "COMPLAINT-2026-05-20-001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guestName` | string | YES | Guest's full name |
| `guestEmail` | string | no | Guest email for follow-up |
| `guestPhone` | string | no | Guest phone for follow-up |
| `subject` | string | YES | Short summary of the complaint |
| `description` | string | YES | Full complaint text |
| `source` | string | YES | Origin system: `"pos"`, `"email"`, `"social"`, `"phone"`, `"walk_in"` |
| `locationStoreNumber` | string | YES | Store number to match against `Location.storeNumber` |
| `externalId` | string | no | Dedupe key from the source system (prevents duplicate complaints) |

#### Sales Payload Spec

**Endpoint:** `POST /api/webhooks/{orgSlug}/sales`

```json
{
  "date": "2026-05-20",
  "locationStoreNumber": "101",
  "totalAmount": 6523.45,
  "transactionCount": 218,
  "checkAverage": 29.92,
  "channelSplit": {
    "dine_in": 3800.00,
    "drive_thru": 1800.00,
    "delivery": 923.45
  },
  "externalId": "SALES-101-2026-05-20"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string (YYYY-MM-DD) | YES | Business date for the sales data |
| `locationStoreNumber` | string | YES | Store number to match against `Location.storeNumber` |
| `totalAmount` | number | YES | Total revenue for the day |
| `transactionCount` | integer | YES | Number of transactions |
| `checkAverage` | number | no | Average check amount (calculated if omitted) |
| `channelSplit` | object | no | Revenue breakdown by channel (`dine_in`, `drive_thru`, `delivery`, `catering`, `mobile_order`) |
| `externalId` | string | no | Dedupe key (prevents duplicate sales records for same date) |

---

### 14.1 Submit Complaint via Webhook

```bash
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/complaints" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $(echo -n '{"guestName":"Jane Smith","guestEmail":"jane.smith@email.com","subject":"Cold food","description":"Burger was cold and fries were soggy.","source":"pos","locationStoreNumber":"'"$LOCATION_STORE_NUMBER"'"}' | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)" \
  -d '{
    "guestName": "Jane Smith",
    "guestEmail": "jane.smith@email.com",
    "subject": "Cold food",
    "description": "Burger was cold and fries were soggy.",
    "source": "pos",
    "locationStoreNumber": "'"$LOCATION_STORE_NUMBER"'"
  }' | jq .
```

**Expected:**
```json
{
  "success": true,
  "eventId": "clxxx...",
  "complaint": {
    "id": "clxxx...",
    "caseNumber": "clxxx...",
    "status": "new"
  }
}
```

### 14.2 Submit Complaint with externalId (Dedupe Test)

```bash
# First submission
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Bob Jones",
    "subject": "Wrong order",
    "description": "Received chicken sandwich instead of beef.",
    "source": "pos",
    "locationStoreNumber": "'"$LOCATION_STORE_NUMBER"'",
    "externalId": "POS-COMPLAINT-99"
  }' | jq .

# Second submission with same externalId (should dedupe)
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Bob Jones",
    "subject": "Wrong order",
    "description": "Received chicken sandwich instead of beef.",
    "source": "pos",
    "locationStoreNumber": "'"$LOCATION_STORE_NUMBER"'",
    "externalId": "POS-COMPLAINT-99"
  }' | jq .
```

**Expected (second call):** `200 OK` with `{ "success": true, "deduplicated": true }` or `409 Conflict`.

### 14.3 Submit Sales Data via Webhook

```bash
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/sales" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-20",
    "locationStoreNumber": "'"$LOCATION_STORE_NUMBER"'",
    "totalAmount": 6523.45,
    "transactionCount": 218,
    "checkAverage": 29.92,
    "channelSplit": {
      "dine_in": 3800.00,
      "drive_thru": 1800.00,
      "delivery": 923.45
    },
    "externalId": "SALES-'"$LOCATION_STORE_NUMBER"'-2026-05-20"
  }' | jq .
```

**Expected:**
```json
{
  "success": true,
  "eventId": "clxxx...",
  "salesData": {
    "id": "clxxx...",
    "date": "2026-05-20",
    "totalAmount": 6523.45,
    "transactionCount": 218
  }
}
```

### 14.4 Webhook with Invalid Store Number

```bash
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Test",
    "subject": "Test",
    "description": "Test",
    "source": "pos",
    "locationStoreNumber": "INVALID-999"
  }' | jq .
```

**Expected:** `400 Bad Request` or `422 Unprocessable Entity` with error indicating unknown store number.

### 14.5 Webhook with Invalid Org Slug

```bash
curl -s -X POST "$BASE_URL/api/webhooks/nonexistent-org/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Test",
    "subject": "Test",
    "description": "Test",
    "source": "pos",
    "locationStoreNumber": "101"
  }' | jq .
```

**Expected:** `404 Not Found`

### 14.6 Webhook with Missing Required Fields

```bash
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/complaints" \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Test"
  }' | jq .
```

**Expected:** `400 Bad Request` with Zod validation errors listing missing fields.

### 14.7 Webhook to Unknown Channel

```bash
curl -s -X POST "$BASE_URL/api/webhooks/$ORG_SLUG/unknown-channel" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected:** `404 Not Found` — only `complaints`, `sales` (and potentially `generic`) channels are valid.

---

## Step 15 — API Keys (Bearer Auth on /api/v1/*)

### 15.1 Test API Key Auth on Equipment Types

```bash
curl -s "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $API_KEY" | jq .
```

**Expected:** Same response as session-based auth, scoped to the org the API key belongs to.

### 15.2 Test API Key Auth on Checklist Instances

```bash
curl -s "$BASE_URL/api/v1/instances?locationId=$LOCATION_ID&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $API_KEY" | jq .
```

### 15.3 Test API Key Auth on Reports

```bash
curl -s "$BASE_URL/api/v1/reports/compliance?locationId=$LOCATION_ID&from=2026-05-01&to=2026-05-20" \
  -H "Authorization: Bearer $API_KEY" | jq .
```

### 15.4 Test API Key with Write Operation (should fail — read-only)

```bash
curl -s -X POST "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Equipment",
    "category": "Test"
  }' | jq .
```

**Expected:** `403 Forbidden` — API keys are read-only.

### 15.5 Test Expired API Key

```bash
curl -s "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer $EXPIRED_API_KEY" | jq .
```

**Expected:** `401 Unauthorized`

### 15.6 Test Invalid API Key

```bash
curl -s "$BASE_URL/api/v1/equipment-types" \
  -H "Authorization: Bearer wtf_live_invalidkey123" | jq .
```

**Expected:** `401 Unauthorized`

### 15.7 Test API Key Location Scoping

If the API key is scoped to specific locationIds, requests for other locations should return empty results:

```bash
curl -s "$BASE_URL/api/v1/instances?locationId=UNSCOPED_LOCATION_ID&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $API_KEY" | jq .
```

**Expected:** Empty `instances` array or `403 Forbidden`.

### 15.8 Test Rate Limiting

```bash
# Fire 1001 requests rapidly (default rate limit is 1000/hr)
for i in $(seq 1 1001); do
  curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/api/v1/equipment-types" \
    -H "Authorization: Bearer $API_KEY"
done | sort | uniq -c
```

**Expected:** First 1000 return `200`, the 1001st returns `429 Too Many Requests`.

---

## Step 16 — SaaS Admin

All requests use the SaaS admin JWT token.

### 16.1 List Organizations

```bash
curl -s "$BASE_URL/api/saas-admin/organizations" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

**Expected:**
```json
{
  "organizations": [
    {
      "id": "clxxx...",
      "name": "Demo Restaurant Group",
      "slug": "demo-restaurant-group",
      "subscription": {
        "planId": "clxxx...",
        "plan": { "name": "Professional" },
        "status": "ACTIVE"
      },
      "_count": { "users": 15, "locations": 3 },
      "createdAt": "2026-01-15T..."
    }
  ],
  "total": 1
}
```

### 16.2 Provision New Organization

```bash
curl -s -X POST "$BASE_URL/api/saas-admin/organizations" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Burger Chain",
    "slug": "test-burger-chain",
    "planId": "'"$PLAN_ID"'",
    "adminEmail": "admin@testburger.com",
    "adminPassword": "TempPass123!",
    "adminName": "Test Admin",
    "provisionManually": true
  }' | jq .
```

**Expected:**
```json
{
  "organization": {
    "id": "clxxx...",
    "name": "Test Burger Chain",
    "slug": "test-burger-chain"
  },
  "subscription": {
    "id": "clxxx...",
    "status": "TRIALING",
    "provisionedManually": true
  },
  "adminUser": {
    "id": "clxxx...",
    "email": "admin@testburger.com",
    "name": "Test Admin"
  }
}
```

### 16.3 Get Organization Detail

```bash
curl -s "$BASE_URL/api/saas-admin/organizations/$ORG_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.4 Suspend Organization

```bash
curl -s -X PATCH "$BASE_URL/api/saas-admin/organizations/$ORG_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "suspend",
    "reason": "Non-payment"
  }' | jq .
```

### 16.5 Reactivate Organization

```bash
curl -s -X PATCH "$BASE_URL/api/saas-admin/organizations/$ORG_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reactivate"
  }' | jq .
```

### 16.6 List Plans

```bash
curl -s "$BASE_URL/api/saas-admin/plans" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

**Expected:**
```json
{
  "plans": [
    {
      "id": "clxxx...",
      "name": "Starter",
      "slug": "starter",
      "priceMonthly": 99.00,
      "priceAnnual": 990.00,
      "features": { "modules": ["checklists"], "maxLocations": 3, "maxUsers": 10 },
      "limits": { "locations": 3, "users": 10, "apiKeysPerOrg": 1 }
    },
    {
      "id": "clxxx...",
      "name": "Professional",
      "slug": "professional",
      "priceMonthly": 249.00,
      "priceAnnual": 2490.00,
      "isPopular": true
    },
    {
      "id": "clxxx...",
      "name": "Enterprise",
      "slug": "enterprise",
      "priceMonthly": 499.00,
      "priceAnnual": 4990.00
    }
  ]
}
```

### 16.7 Manage Subscription

```bash
curl -s "$BASE_URL/api/saas-admin/subscriptions?organizationId=$ORG_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.8 Extend Trial

```bash
curl -s -X PATCH "$BASE_URL/api/saas-admin/subscriptions/$SUBSCRIPTION_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "extend_trial",
    "trialEndsAt": "2026-06-20T00:00:00.000Z"
  }' | jq .
```

### 16.9 Change Plan

```bash
curl -s -X PATCH "$BASE_URL/api/saas-admin/subscriptions/$SUBSCRIPTION_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change_plan",
    "planId": "'"$PLAN_ID"'"
  }' | jq .
```

### 16.10 List Support Tickets (All Orgs)

```bash
curl -s "$BASE_URL/api/saas-admin/support" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.11 Reply to Support Ticket

```bash
curl -s -X POST "$BASE_URL/api/saas-admin/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Thank you for reaching out. We have looked into this issue and it has been resolved.",
    "isStaff": true
  }' | jq .
```

### 16.12 Close Support Ticket

```bash
curl -s -X PATCH "$BASE_URL/api/saas-admin/support/$TICKET_ID" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }' | jq .
```

### 16.13 Manage Webhook Endpoints for Org

```bash
curl -s "$BASE_URL/api/saas-admin/organizations/$ORG_ID/webhooks" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.14 Create Webhook Endpoint

```bash
curl -s -X POST "$BASE_URL/api/saas-admin/organizations/$ORG_ID/webhooks" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "complaints",
    "secret": "whsec_test_secret_key_123"
  }' | jq .
```

### 16.15 Manage API Keys for Org

```bash
curl -s "$BASE_URL/api/saas-admin/organizations/$ORG_ID/api-keys" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.16 Create API Key

```bash
curl -s -X POST "$BASE_URL/api/saas-admin/organizations/$ORG_ID/api-keys" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "POS Integration Key",
    "scopes": ["checklists.read", "reports.read", "temperature.read"],
    "locationIds": [],
    "rateLimit": 1000,
    "expiresAt": "2027-05-20T00:00:00.000Z"
  }' | jq .
```

**Expected:**
```json
{
  "apiKey": {
    "id": "clxxx...",
    "name": "POS Integration Key",
    "keyPrefix": "wtf_live_",
    "key": "wtf_live_abc123def456...",
    "scopes": ["checklists.read", "reports.read", "temperature.read"]
  },
  "warning": "The full API key is shown only once. Store it securely."
}
```

```bash
export API_KEY="<from-response.apiKey.key>"
```

### 16.17 Revoke API Key

```bash
curl -s -X DELETE "$BASE_URL/api/saas-admin/organizations/$ORG_ID/api-keys/<api-key-id>" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.18 View Webhook Event Log

```bash
curl -s "$BASE_URL/api/saas-admin/organizations/$ORG_ID/webhook-log" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.19 View Audit Log

```bash
curl -s "$BASE_URL/api/saas-admin/audit-log?limit=50" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

**Expected:**
```json
{
  "entries": [
    {
      "id": "clxxx...",
      "action": "org.provisioned",
      "targetOrgId": "clxxx...",
      "adminId": "clxxx...",
      "metadata": { "orgName": "Test Burger Chain", "planName": "Professional" },
      "createdAt": "2026-05-20T..."
    }
  ]
}
```

### 16.20 Knowledge Base CRUD

```bash
# Create article
curl -s -X POST "$BASE_URL/api/saas-admin/knowledge-base" \
  -H "Authorization: Bearer $SAAS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with Checklists",
    "slug": "getting-started-checklists",
    "summary": "Learn how to set up and use checklists in WalkTheFloor.",
    "body": "## Step 1: Create Equipment Types\n\nBefore creating checklists...",
    "category": "Getting Started",
    "tags": ["checklists", "setup"],
    "isPublished": true
  }' | jq .

# List articles
curl -s "$BASE_URL/api/saas-admin/knowledge-base" \
  -H "Authorization: Bearer $SAAS_TOKEN" | jq .
```

### 16.21 Tenant Cannot Access SaaS Admin Routes

```bash
curl -s "$BASE_URL/api/saas-admin/organizations" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `403 Forbidden` — tenant tokens cannot access `/api/saas-admin/*`.

---

## Step 17 — Stripe Webhooks

### 17.1 Simulate checkout.session.completed

```bash
curl -s -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_checkout_completed",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "customer": "cus_test_123",
        "subscription": "sub_test_123",
        "metadata": {
          "organizationId": "'"$ORG_ID"'",
          "planId": "'"$PLAN_ID"'"
        }
      }
    }
  }' | jq .
```

> Note: In production, Stripe signature verification will reject test payloads. For local testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### 17.2 Simulate invoice.payment_succeeded

```bash
curl -s -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_invoice_paid",
    "type": "invoice.payment_succeeded",
    "data": {
      "object": {
        "id": "in_test_123",
        "subscription": "sub_test_123",
        "amount_paid": 24900,
        "currency": "usd"
      }
    }
  }' | jq .
```

### 17.3 Simulate customer.subscription.deleted

```bash
curl -s -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_sub_deleted",
    "type": "customer.subscription.deleted",
    "data": {
      "object": {
        "id": "sub_test_123",
        "customer": "cus_test_123"
      }
    }
  }' | jq .
```

### 17.4 Simulate invoice.payment_failed

```bash
curl -s -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=test_signature" \
  -d '{
    "id": "evt_test_payment_failed",
    "type": "invoice.payment_failed",
    "data": {
      "object": {
        "id": "in_test_456",
        "subscription": "sub_test_123",
        "amount_due": 24900,
        "currency": "usd"
      }
    }
  }' | jq .
```

**Expected:** Subscription status transitions to `PAST_DUE`.

---

## Step 18 — Notifications

### 18.1 Get Unread Notification Count

```bash
curl -s "$BASE_URL/api/v1/notifications/count" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "unread": 5
}
```

### 18.2 List Notifications

```bash
curl -s "$BASE_URL/api/v1/notifications?limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "notifications": [
    {
      "id": "clxxx...",
      "type": "corrective_action.created",
      "title": "New Corrective Action",
      "body": "Non-compliant temperature reading at Walk-in Freezer 1",
      "link": "/checklists/corrective-actions?id=clxxx...",
      "isRead": false,
      "createdAt": "2026-05-20T..."
    }
  ],
  "total": 5
}
```

### 18.3 Mark Single Notification as Read

```bash
export NOTIFICATION_ID="<from-previous-response>"

curl -s -X PATCH "$BASE_URL/api/v1/notifications/$NOTIFICATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isRead": true
  }' | jq .
```

### 18.4 Mark All Notifications as Read

```bash
curl -s -X POST "$BASE_URL/api/v1/notifications/mark-all-read" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:**
```json
{
  "success": true,
  "updated": 5
}
```

### 18.5 Verify Count After Mark-All

```bash
curl -s "$BASE_URL/api/v1/notifications/count" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** `{ "unread": 0 }`

---

## Step 19 — Resend Inbound Webhook

### 19.1 Simulate Inbound Email (Creates Complaint)

```bash
curl -s -X POST "$BASE_URL/api/resend/inbound" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "unhappy.customer@gmail.com",
    "to": "complaints-store101@inbound.walkthefloor.com",
    "subject": "Terrible experience at your location",
    "text": "I visited your store at 123 Main St yesterday and the service was awful...",
    "headers": {}
  }' | jq .
```

**Expected:** The inbound email is routed through the webhook pipeline to create a Complaint record, matching the store via the `to` address pattern.

---

## Step 20 — Support Tickets (Tenant Side)

### 20.1 Create Support Ticket

```bash
curl -s -X POST "$BASE_URL/api/v1/support" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Cannot see temperature logs",
    "category": "technical",
    "message": "When I navigate to the temperature log page, it shows a blank screen. This started after the latest update."
  }' | jq .
```

**Expected:**
```json
{
  "ticket": {
    "id": "clxxx...",
    "subject": "Cannot see temperature logs",
    "category": "technical",
    "status": "open",
    "messages": [
      {
        "id": "clxxx...",
        "body": "When I navigate to the temperature log page...",
        "isStaff": false,
        "createdAt": "2026-05-20T..."
      }
    ]
  }
}
```

```bash
export TICKET_ID="<from-response.ticket.id>"
```

### 20.2 List My Tickets

```bash
curl -s "$BASE_URL/api/v1/support" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 20.3 Reply to Ticket

```bash
curl -s -X POST "$BASE_URL/api/v1/support/$TICKET_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "I tried clearing my browser cache but the issue persists."
  }' | jq .
```

### 20.4 Get Ticket Detail (with all messages)

```bash
curl -s "$BASE_URL/api/v1/support/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

# Section 2: Playwright E2E Tests

Test specifications for browser-based end-to-end tests. Each spec describes the flow, assertions, and edge cases. Tests should be implemented using `@playwright/test` with the project's auth fixtures.

---

## E2E-1: Login Flows

### E2E-1.1: Tenant Login (email/password)

- Navigate to `/login`
- Verify login form is visible with email and password fields
- Enter valid credentials (`rgm@demo-org.com` / `password123`)
- Click "Sign In"
- Assert redirect to `/checklists` (or role-specific dashboard)
- Assert sidebar/bottom-nav is visible
- Assert user name appears in top bar
- Assert location selector shows the user's home location

### E2E-1.2: PIN Login with Device URL Param

- Navigate to `/pin-login?device=<device-token>`
- Verify PIN input pad is displayed (4-6 digit input)
- Enter valid PIN (`1234`)
- Assert redirect to dashboard
- Assert session user type is `pin_only`
- Assert limited navigation (no admin sections)

### E2E-1.3: PIN Login without Device Token

- Navigate to `/pin-login` (no `?device=` param)
- Assert error message: device token required, or redirect to `/login`

### E2E-1.4: SaaS Admin Login

- Navigate to `/saas-login`
- Verify separate login form (visually distinct from tenant login)
- Enter SaaS admin credentials
- Assert redirect to `/saas-admin`
- Assert SaaS admin layout (not the tenant app shell)
- Assert dashboard shows org count, MRR, active users

### E2E-1.5: Invalid Credentials

- Navigate to `/login`
- Enter wrong password
- Click "Sign In"
- Assert error message is displayed (e.g., "Invalid email or password")
- Assert no redirect occurs
- Assert no session is created

### E2E-1.6: Inactive/Deactivated Account

- Navigate to `/login`
- Enter credentials for a deactivated user
- Assert error message: account is deactivated
- Assert no session is created

### E2E-1.7: Logout

- Log in as tenant user
- Click user menu in top bar
- Click "Sign Out"
- Assert redirect to `/login`
- Attempt to navigate to `/checklists` directly
- Assert redirect back to `/login` (protected route)

---

## E2E-2: App Shell & Navigation

### E2E-2.1: Desktop Sidebar Navigation

- Log in as RGM (full access)
- At viewport 1280px wide, assert left sidebar is visible
- Assert sidebar contains: Checklists, Dashboard, Documents, Support, Admin sections
- Click each nav item and verify the correct page loads
- Assert active state highlights on the current nav item
- Assert the WalkTheFloor logo is at the top of the sidebar

### E2E-2.2: Mobile Bottom Navigation

- Log in as RGM
- Set viewport to 375px wide
- Assert sidebar is NOT visible
- Assert bottom tab bar is visible
- Assert bottom nav contains key items: Checklists, Dashboard, More
- Tap each bottom nav item and verify correct page loads

### E2E-2.3: Location Selector

- Log in as Multi-unit Manager (multiple locations)
- Assert location selector is visible in the top bar
- Click location selector
- Assert dropdown shows all assigned locations
- Select a different location
- Assert page data refreshes for the selected location
- Assert checklist instances now reflect the new location

### E2E-2.4: User Menu

- Assert user menu shows user name and role
- Click user menu
- Assert options: Profile/Settings, Sign Out
- Verify Sign Out works (covered in E2E-1.7)

### E2E-2.5: Role-Based Navigation Visibility

- Log in as Team Member
- Assert Admin section is NOT visible in navigation
- Assert cannot navigate to `/admin/*` routes directly (redirect or 403)
- Log in as RGM
- Assert Admin section IS visible
- Assert Compliance Failures page IS accessible

---

## E2E-3: Checklist Execution

### E2E-3.1: View Today's Checklists

- Log in as RGM at a location with configured checklists
- Navigate to `/checklists`
- Assert Book Dashboard shows KPI cards (Open, Overdue, Completed, All)
- Assert category cards are displayed (Book Logs, Opening, Closing, etc.)
- Assert radial compliance chart is visible

### E2E-3.2: Open a Checklist Instance

- From the dashboard, click on a PENDING checklist instance (e.g., "Book Logs - AM")
- Assert navigates to `/checklists/[instanceId]`
- Assert checklist title and window label are displayed
- Assert progress bar shows 0% initially
- Assert all tasks are listed, grouped by equipment type where applicable
- Assert each task shows its type indicator (thermometer icon for temp, toggle for yes/no, etc.)

### E2E-3.3: Complete Tasks One by One (Auto-Save)

- For a YES_NO task: tap Yes/No toggle, assert it saves immediately (no submit button)
- Assert progress bar updates (e.g., from 0% to 6.7% after 1 of 15 tasks)
- For a TEMPERATURE task: enter a temperature value in the input field
- Assert the input validates against min/max range from config
- For a SELECT task: choose from dropdown, assert selection saves
- For a TEXT task: type in free-text field, assert it saves on blur
- Verify that refreshing the page preserves all completed tasks (auto-saved to server)

### E2E-3.4: Non-Compliant Reading Creates CA

- Enter a temperature OUTSIDE the valid range (e.g., 38°F for a freezer with range -10 to 0°F)
- Assert the task shows a non-compliant indicator (red border, warning icon)
- Assert a toast/notification appears: "Corrective Action created"
- Navigate to `/checklists/corrective-actions`
- Assert the new CA appears in the list with status OPEN
- Assert CA title references the equipment name and reading value

### E2E-3.5: Progress Bar Completion

- Complete all remaining tasks in the checklist
- Assert progress bar reaches 100%
- Assert instance status changes to COMPLETED
- Assert a success state is shown (checkmark, green banner, etc.)
- Navigate back to checklist dashboard
- Assert the instance now shows as COMPLETED in the list

### E2E-3.6: Photo Upload on Task

- For a task with `requiresPhoto: true`, assert the camera/upload button is visible
- Click upload, select an image file
- Assert image preview appears
- Assert the completion includes the photo URL

### E2E-3.7: Checklist Cannot Be Submitted After Window Closes

- Mock the time to be past the window end time
- Attempt to complete a task
- Assert error: "This checklist window has closed"
- Assert instance status is MISSED

---

## E2E-4: Corrective Actions

### E2E-4.1: View CA List

- Navigate to `/checklists/corrective-actions`
- Assert page shows filter tabs: All, Open, In Progress, Resolved, Overdue
- Assert card layout with CA title, priority badge, status badge, assignee, created date
- Assert "My CAs" filter shows only CAs assigned to the current user

### E2E-4.2: CA Detail View

- Click on a CA from the list
- Assert detail panel/page shows: title, description, priority, status, assignee
- Assert source context is shown: actual value vs target value vs valid range
- Assert comments section is visible
- Assert linked checklist/task information is shown

### E2E-4.3: Add Comment

- In the CA detail view, type a comment in the comment input
- Click "Add Comment"
- Assert comment appears in the comments list with user name and timestamp
- Assert comment count updates

### E2E-4.4: Change CA Status

- In the CA detail view, click status dropdown/button
- Change from OPEN to IN_PROGRESS
- Assert status badge updates
- Assert a system comment is added noting the status change
- Change from IN_PROGRESS to RESOLVED
- Enter resolution notes
- Assert status changes and resolvedAt timestamp appears

### E2E-4.5: Priority Badge Colors

- Assert LOW = blue/gray badge
- Assert MEDIUM = yellow badge
- Assert HIGH = orange badge
- Assert CRITICAL = red badge

---

## E2E-5: Compliance Failures

### E2E-5.1: RGM Views Missed Checklists

- Log in as RGM
- Navigate to `/checklists/failures`
- Assert page shows list of compliance failures for the user's location(s)
- Assert each failure shows: checklist name, window label, date, status
- Assert "unexcused" failures are highlighted

### E2E-5.2: RGM Provides Explanation

- Click on an "unexcused" failure
- Assert explanation form is visible
- Enter explanation text: "Power outage from 2pm-6pm"
- Click "Submit Explanation"
- Assert status changes from "unexcused" to "pending_review"
- Assert "explainedAt" timestamp appears
- Assert the explanation text is displayed

### E2E-5.3: Multi-unit Manager Reviews Failures

- Log in as Multi-unit Manager
- Navigate to `/checklists/failures`
- Assert "pending_review" failures from all managed locations are visible
- Click on a pending failure
- Assert the RGM's explanation is displayed
- Assert Approve and Deny buttons are visible

### E2E-5.4: Approve Explanation

- Click "Approve" (or "Excuse")
- Optionally enter review notes
- Assert status changes to "excused"
- Assert reviewedBy and reviewedAt are populated
- Verify this failure no longer counts in compliance percentage metrics

### E2E-5.5: Deny Explanation

- Click "Deny" on a different pending failure
- Enter review notes: "Store was operational during the stated period"
- Assert status changes to "denied"
- Verify this failure DOES count in compliance percentage metrics

---

## E2E-6: Checklist Adherence

### E2E-6.1: Multi-unit Manager Views Adherence Grid

- Log in as Multi-unit Manager (manages multiple locations)
- Navigate to `/checklists/adherence`
- Assert a grid/table is displayed: rows = locations, columns = checklist templates
- Assert each cell shows completion percentage and/or count
- Assert color coding: green (>=90%), yellow (75-89%), red (<75%)
- Assert location names and store numbers are displayed

### E2E-6.2: Adherence Grid Date Range

- Change the date range filter (e.g., last 7 days, last 30 days)
- Assert grid data updates to reflect the selected range
- Assert no loading errors

### E2E-6.3: Drill-Down

- Click on a specific cell in the grid (e.g., Store #101 x Book Logs)
- Assert a detail view shows:
  - List of individual instances within the date range
  - Status of each instance (Completed, Missed, Completed Late)
  - Failure reasons if applicable

---

## E2E-7: Dashboard

### E2E-7.1: RGM Dashboard (Single Location)

- Log in as RGM
- Navigate to `/checklists` (Book Dashboard)
- Assert KPI cards show: Open tasks, Overdue, Completed today, Total
- Assert compliance radial chart shows percentage
- Assert category cards show per-category breakdown
- Assert data is scoped to the RGM's home location only
- Assert no multi-location roll-up is visible

### E2E-7.2: Multi-unit Manager Dashboard (Multi-Location Roll-Up)

- Log in as Multi-unit Manager
- Navigate to `/checklists`
- Assert dashboard shows aggregated data across all managed locations
- Assert location breakdown table/cards are visible
- Assert clicking on a location card drills into that location's data

### E2E-7.3: Dashboard Real-Time Updates

- Open the dashboard
- In a separate session, complete a checklist task
- Assert the dashboard KPI cards update (may require page refresh or polling)

---

## E2E-8: Admin -- Users

### E2E-8.1: View User List

- Log in as admin (Franchisee or Director role)
- Navigate to `/admin/users`
- Assert user table is displayed with columns: Name, Email, Role, Location, Status
- Assert search/filter works
- Assert pagination works if >10 users

### E2E-8.2: Create User

- Click "Add User" button
- Fill in form: name, email, password, role (select from dropdown), home location, manager
- Click "Create"
- Assert new user appears in the list
- Assert success toast

### E2E-8.3: Create PIN-Only User

- Click "Add User"
- Select user type: "PIN Only"
- Assert email and password fields are hidden
- Enter: name, PIN (4-6 digits), role, home location
- Click "Create"
- Assert new PIN-only user appears in the list

### E2E-8.4: Assign Role

- Click on an existing user
- Change role from "Team Member" to "RGM"
- Save
- Assert role badge updates in the list

### E2E-8.5: Assign Locations

- In user edit view, add additional locations
- Assert multi-select location picker works
- Save
- Assert the user now appears under multiple locations

### E2E-8.6: View Hierarchy

- Assert manager-report chain is visible (either tree view or breadcrumb)
- Assert clicking on a manager name navigates to that user's profile
- Assert direct reports count is accurate

### E2E-8.7: Deactivate User

- Click "Deactivate" on a user
- Assert confirmation dialog appears
- Confirm deactivation
- Assert user status changes to inactive (grayed out in list)
- Assert deactivated user cannot log in (verify via separate login attempt)

---

## E2E-9: Admin -- Locations

### E2E-9.1: View Location List

- Navigate to `/admin/locations`
- Assert location table with: Name, Store Number, Address, Status, Equipment Count
- Assert search/filter functionality

### E2E-9.2: Create Location

- Click "Add Location"
- Fill in: name, store number, address, timezone, operating hours
- Click "Create"
- Assert new location appears in the list

### E2E-9.3: Configure Book Tab (Equipment + Tasks)

- Click on a location, navigate to Book configuration tab
- Assert equipment assignment interface is visible
- Add an equipment type with instance name (e.g., "Walk-in Freezer 1")
- Assert equipment appears in the location's equipment list
- Assert sort order can be adjusted via drag-drop or number input

### E2E-9.4: Clone Configuration

- On a configured location, click "Clone Config" or "Copy to Another Location"
- Select the target location
- Assert equipment assignments and task configurations are copied
- Navigate to the target location and verify the cloned configuration

### E2E-9.5: Location Template Overrides

- In location Book config, select a checklist template
- Override compliance windows (e.g., change AM window from 05:00-11:00 to 06:00-10:00)
- Save
- Assert overrides are persisted
- Verify that generated instances use the overridden windows

---

## E2E-10: Admin -- Equipment

### E2E-10.1: View Equipment Type Catalog

- Navigate to `/admin/equipment`
- Assert table shows org-level equipment types: Name, Category, Locations using, Tasks
- Assert search works

### E2E-10.2: Create Equipment Type

- Click "Add Equipment Type"
- Enter name: "Beverage Dispenser", category: "Beverage"
- Click "Create"
- Assert new type appears in the list

### E2E-10.3: Assign Equipment Type to Location

- From equipment type detail or location config page
- Assign "Beverage Dispenser" to Store #101 with instance name "Beverage Dispenser 1"
- Assert the location equipment count increments

### E2E-10.4: Edit Equipment Type

- Click on an equipment type
- Change the category
- Save
- Assert change persists

### E2E-10.5: Delete Equipment Type in Use (should warn)

- Attempt to delete an equipment type that has location equipment instances
- Assert warning dialog: "This equipment type is used at X locations"
- Assert cascade implications are shown

---

## E2E-11: Template Builder

### E2E-11.1: Create Custom Checklist

- Navigate to `/checklists/templates/new`
- Enter template name: "Weekly Deep Clean"
- Select category: "Custom"
- Configure schedule: frequency = weekly, days = [Monday], windows = [{ 05:00-23:00 }]
- Assert schedule preview shows correctly

### E2E-11.2: Add Tasks with Different Types

- Click "Add Task"
- Create YES_NO task: title = "Fryer cleaned", expected answer = Yes
- Create TEMPERATURE task: title = "Grill temperature", min = 350, max = 450, target = 400, unit = F
- Create SELECT task: title = "Floor condition", choices = ["Good", "Fair", "Poor"]
- Create TEXT task: title = "Notes"
- Create PHOTO_ONLY task: title = "Photo of kitchen area"
- Assert each task shows the correct type icon and configuration

### E2E-11.3: Reorder Tasks

- Drag task 3 above task 1 (or use sort order controls)
- Assert sortOrder updates
- Save template
- Re-open template and verify order persisted

### E2E-11.4: Equipment-Linked Task

- Add a task and link it to an equipment type (e.g., "Walk-in Freezer")
- Assert the equipment type selector works
- Save
- Assert the task shows the equipment type association

### E2E-11.5: Mark Task as Critical

- Toggle "Critical" flag on a temperature task
- Assert isCritical badge appears
- Save
- Assert critical tasks trigger email alerts when non-compliant (verify via notification)

### E2E-11.6: Edit Existing Template

- Navigate to `/checklists/templates`
- Click on an existing template
- Modify name, add a task, remove a task
- Save
- Assert version increments

### E2E-11.7: Cannot Edit Built-in Template Structure

- Open a built-in template (e.g., "Book Logs")
- Assert task addition/removal is disabled (or clearly marked as read-only)
- Assert only metadata fields (name, description) may be editable

---

## E2E-12: SaaS Admin Portal

### E2E-12.1: SaaS Admin Login and Dashboard

- Navigate to `/saas-login`
- Log in with SaaS admin credentials
- Assert redirect to `/saas-admin`
- Assert dashboard shows: total organizations, total users, MRR, active subscriptions
- Assert recent activity feed is visible

### E2E-12.2: Organization List

- Navigate to `/saas-admin/organizations`
- Assert table with: Org Name, Slug, Plan, Status, Users, Locations, Created
- Assert search by org name works
- Assert filter by subscription status works

### E2E-12.3: Provision New Organization

- Click "Provision Organization"
- Fill in: org name, slug, plan selection, admin email, admin name, admin password
- Click "Provision"
- Assert success message
- Assert new org appears in the list
- Assert audit log entry is created

### E2E-12.4: Organization Detail

- Click on an organization
- Assert detail page shows: org info, subscription details, user count, location count
- Assert tabs: Overview, Users, Locations, Integrations, Webhook Log
- Navigate through tabs and verify data loads

### E2E-12.5: Manage Subscription

- In org detail, navigate to subscription section
- Assert current plan, status, billing interval are displayed
- Test "Extend Trial" action
- Test "Change Plan" action
- Test "Suspend" action (verify org users cannot log in after suspension)
- Test "Reactivate" action

### E2E-12.6: Integration Management

- Navigate to `/saas-admin/organizations/[orgId]/integrations`
- Assert webhook endpoint management UI
- Create a new webhook endpoint (channel: complaints)
- Assert secret key is generated/displayed
- Assert webhook URL is shown: `/api/webhooks/{slug}/complaints`
- Create an API key with specific scopes
- Assert API key is shown once with copy button
- Assert key prefix format: `wtf_live_...`

### E2E-12.7: Webhook Event Log

- Navigate to webhook log for an org
- Assert table shows: event type, source, processed status, created at
- Click on an event to see full payload
- Assert error messages are displayed for failed events

### E2E-12.8: Audit Log

- Navigate to `/saas-admin/audit-log`
- Assert chronological list of admin actions
- Assert each entry shows: action, admin name, target org, timestamp
- Assert filter by action type works

### E2E-12.9: Knowledge Base Management

- Navigate to `/saas-admin/knowledge-base`
- Create a new article
- Assert rich text editor is available
- Publish the article
- Verify article is accessible from tenant help page (`/help`)

---

## E2E-13: Support Tickets

### E2E-13.1: Tenant Creates Ticket

- Log in as tenant user
- Navigate to `/support`
- Click "New Ticket"
- Fill in subject, category (dropdown), description
- Click "Submit"
- Assert ticket appears in "My Tickets" list with status "open"

### E2E-13.2: Tenant Adds Message to Ticket

- Click on the created ticket
- Type a follow-up message
- Click "Send"
- Assert message appears in the conversation thread
- Assert message is marked as non-staff

### E2E-13.3: SaaS Admin Sees Ticket

- Log in as SaaS admin
- Navigate to `/saas-admin/support`
- Assert the tenant's ticket appears in the global ticket list
- Assert unread indicator is visible

### E2E-13.4: SaaS Admin Replies

- Click on the ticket
- Type a reply
- Click "Send"
- Assert reply appears in the conversation thread
- Assert reply is marked as staff message (different color/alignment)

### E2E-13.5: Tenant Sees Admin Reply

- Log in as tenant user
- Navigate to `/support`
- Assert unread indicator on the ticket
- Open the ticket
- Assert the admin's reply is visible
- Assert staff messages are visually distinguished

### E2E-13.6: Close Ticket

- As SaaS admin, change ticket status to "closed"
- Assert status badge updates
- As tenant, verify the ticket shows as closed
- Assert tenant can still add messages to re-open

---

## E2E-14: Mobile Responsiveness

All tests below should run at viewport **375px x 812px** (iPhone 13/14 dimensions).

### E2E-14.1: Login Page

- Assert login form is centered and fits within viewport
- Assert no horizontal scroll
- Assert inputs are large enough for touch (min 44px touch targets)
- Assert keyboard does not obscure the form (scroll into view)

### E2E-14.2: Checklist Execution (Primary Mobile Screen)

- Navigate to a checklist instance
- Assert task list fills the viewport width
- Assert each task row is easily tappable
- Assert YES_NO toggles are large enough for thumb input
- Assert TEMPERATURE number inputs use numeric keyboard (`inputmode="decimal"`)
- Assert progress bar is visible at top (sticky)
- Assert scrolling through long task lists is smooth

### E2E-14.3: Checklist Dashboard

- Assert KPI cards stack vertically (1 column)
- Assert category cards are scrollable horizontally or stack vertically
- Assert radial chart is readable at mobile width

### E2E-14.4: Corrective Action List

- Assert CA cards stack vertically
- Assert priority and status badges are visible
- Assert card tap opens detail view (not a separate panel — full page on mobile)

### E2E-14.5: Bottom Navigation

- Assert bottom nav bar is fixed to bottom of viewport
- Assert 4-5 nav items fit without truncation
- Assert active item is highlighted
- Assert nav items have sufficient touch target size

### E2E-14.6: Data Tables on Mobile

- Navigate to a page with a data table (e.g., user management)
- Assert table is either horizontally scrollable or converts to card layout
- Assert no content is clipped or unreadable

### E2E-14.7: Forms on Mobile

- Open user creation form at 375px
- Assert all form fields are full-width
- Assert dropdowns open correctly (not clipped)
- Assert submit button is accessible without scrolling past it

### E2E-14.8: Location Selector on Mobile

- Assert location selector is accessible from the top bar
- Assert dropdown/modal opens and is full-width on mobile
- Assert location list is scrollable if many locations

---

## Test Infrastructure Notes

### Authentication Fixtures

Create reusable auth fixtures for Playwright:

- `tenantAuth`: Logs in as RGM with email/password, stores session state
- `pinAuth`: Logs in as Team Member via PIN, stores session state
- `managerAuth`: Logs in as Multi-unit Manager, stores session state
- `adminAuth`: Logs in as Franchisee/Director, stores session state
- `saasAuth`: Logs in as SaaS SUPER_ADMIN, stores session state

### Seed Data Requirements

Tests require the following seed data (created via `/api/setup`):

- 1 Organization ("Demo Restaurant Group", slug: `demo-restaurant-group`)
- 3 Locations (Store #101, Store #102, Store #103) with store numbers
- 5 Built-in roles (Franchisee, Director, Multi-unit Manager, RGM, Team Member)
- 6+ Users across roles, including 1 PIN-only user and 1 deactivated user
- 3 Shifts (AM, PM, Overnight)
- 5+ Equipment types with location assignments
- 4 Built-in checklist templates with tasks (Book Logs, Opening, Closing, Food Safety)
- Generated checklist instances for today and the past 30 days
- A few pre-existing corrective actions in various statuses
- A few pre-existing compliance failures in various statuses
- 1 SaaS Admin (SUPER_ADMIN)
- 1 Plan (Professional)
- 1 Subscription (ACTIVE)
- 1 Webhook endpoint (complaints channel for demo org)
- 1 Registered device with token
- A few notifications for the RGM user

### Environment

- Base URL: `http://localhost:3000` (development)
- Database: PostgreSQL (test database, reset between full runs)
- Stripe: Use Stripe test mode keys and CLI for webhook forwarding
- R2/S3: Use local mock or MinIO for photo uploads

### Parallelization Strategy

- Group tests by auth context (tenant vs SaaS admin)
- Tests within a group can run in parallel if they do not share mutable state
- Support ticket tests must run sequentially (tenant creates, admin replies, tenant verifies)
- Checklist execution tests should run sequentially within a single instance

---

*End of QA Test Plan*

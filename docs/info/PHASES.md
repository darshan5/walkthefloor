# Info — Implementation Phases

> Sequenced roadmap. Each phase has clear deliverables and validation criteria.
> See [SPEC.md](./SPEC.md) for the full architecture and design decisions.

---

## Phase Summary

| Phase | Focus | Depends On | Status |
| ----- | ----- | ---------- | ------ |
| 1 | Schema + API + Tag Admin | — | Not started |
| 2 | Folder Navigation + Item List | 1 | Not started |
| 3 | Create/Edit/Delete + FAB | 2 | Not started |

```
Phase 1 ──► Phase 2 ──► Phase 3
schema      browse UI    CRUD UI
+ API       + nav        + sheets
+ tag admin
```

---

## Phase 1 — Schema, API Routes, Tag Admin

### Deliverables

- [ ] Add `InfoFolder`, `InfoItem`, `InfoTag`, `InfoItemTag` models to Prisma schema
- [ ] Run migration
- [ ] Add `ADMIN_VENDORS` → already exists; no new permissions needed (reuse `documents.view` and `documents.manage`)
- [ ] Service: `info-service.ts` — CRUD for items, folders, tags; folder depth validation
- [ ] API: `GET /api/v1/info` — list items + folders at a level (folderId, tagId, search filters)
- [ ] API: `GET /api/v1/info/[id]` — get single item
- [ ] API: `POST /api/v1/info` — create item
- [ ] API: `PATCH /api/v1/info/[id]` — update item
- [ ] API: `DELETE /api/v1/info/[id]` — delete item (Director+ check)
- [ ] API: `GET /api/v1/info/folders` — list all folders as tree
- [ ] API: `POST /api/v1/info/folders` — create folder (depth validation)
- [ ] API: `PATCH /api/v1/info/folders/[id]` — rename folder
- [ ] API: `DELETE /api/v1/info/folders/[id]` — delete folder (must be empty, Director+)
- [ ] API: `GET /api/v1/info/tags` — list tags
- [ ] API: `POST /api/v1/info/tags` — create tag (Director+)
- [ ] API: `DELETE /api/v1/info/tags/[id]` — delete tag (Director+)
- [ ] Admin: Organization settings → "Info" tab with tag management

### Tests

- [ ] Folder depth validation rejects 3rd-level nesting
- [ ] Items at root (no folderId) and in folders both work
- [ ] Tag filter returns correct items
- [ ] Delete folder fails if not empty
- [ ] Only Director+ can delete items and folders

### Validates

All API endpoints return correct data. Tags manageable from admin settings. Folder depth enforced.

---

## Phase 2 — Folder Navigation + Item List

### Deliverables

- [ ] Rename sidebar "Documents" to "Info" (and route from `/documents` to `/info`)
- [ ] Main Info page (`/info`) replacing placeholder
- [ ] Breadcrumb navigation showing current folder path
- [ ] "Back" button to go up one level
- [ ] "Main" button to go to root
- [ ] Folder cards (icon + name, tap to navigate)
- [ ] Item cards (title, description preview, URL, tag badges, tap opens link)
- [ ] Tag filter (multi-select chips)
- [ ] Search bar (filters by title and description)
- [ ] Empty states per context

### Tests

- [ ] Navigating into folders updates breadcrumbs
- [ ] Back goes up one level, Main goes to root
- [ ] Tag filter narrows items
- [ ] Search filters by title/description
- [ ] Items open in new tab on click

### Validates

Users can browse the folder tree, filter by tags, search, and open links.

---

## Phase 3 — Create/Edit/Delete + FAB

### Deliverables

- [ ] FAB (circle + button, bottom-right) to create item or folder
- [ ] Create item sheet: title, URL, description, folder select, tag multi-select
- [ ] Create folder modal: name, parent folder select (with depth validation)
- [ ] Edit item: tap edit icon on card → same sheet pre-filled
- [ ] Delete item/folder: confirmation dialog, Director+ only
- [ ] Edit/delete icons only visible to users with correct permissions

### Tests

- [ ] Create item appears in correct folder
- [ ] Edit updates item in place
- [ ] Delete only available for Director+
- [ ] Cannot create folder at depth 3
- [ ] Tags persist on edit

### Validates

Full CRUD lifecycle works. Permission boundaries enforced in UI and API.

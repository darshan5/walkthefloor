# Info — Product & Architecture Specification

> Bookmarkable links with descriptions, organized into folders with predefined tags.

---

## 1. Overview

Replaces the "Documents" module. Info is a shared link library for restaurant teams — SOPs, training videos, vendor portals, health department references, HR resources. Organized into nested folders (max 2 levels deep) with admin-defined tags for cross-referencing.

Not a file storage system — every item is a URL with metadata.

---

## 2. Users & Access

| Action | Minimum Role | Permission Key |
|--------|-------------|----------------|
| View all items | All users | `documents.view` |
| Create/edit items and folders | Multi-unit Manager | `documents.manage` |
| Delete items and folders | Director | (check role name) |
| Manage tags | Director+ (via Admin → Org settings) | `admin.org` |

Deletion check is role-based: the user's role name must be "Director of Operations" or "Franchisee". This avoids adding a new permission — Director+ already has `admin.org` which gates the settings page where tags are managed.

---

## 3. Data Model

### InfoFolder

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | String | Folder name |
| parentId | FK → InfoFolder? | Null = root level. Max 2 levels (parent can have a parent, but grandchild cannot) |
| organizationId | FK → Organization | Org-scoped |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Constraint: `parentId` folder's own `parentId` must be null (enforces 2-level max).

### InfoItem

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| title | String | Required |
| url | String | Required, the bookmark URL |
| description | String? | Optional details |
| folderId | FK → InfoFolder? | Null = root level |
| organizationId | FK → Organization | Org-scoped |
| createdById | FK → User | Who created it |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### InfoTag

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| name | String | Tag label, unique per org |
| organizationId | FK → Organization | Org-scoped |

### InfoItemTag (join table)

| Field | Type | Notes |
|-------|------|-------|
| itemId | FK → InfoItem | |
| tagId | FK → InfoTag | |

Composite PK: `(itemId, tagId)`.

---

## 4. API Design

### Info Items

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/info` | List items + folders at a path (query: `folderId`, `tagId`, `search`) | All users |
| GET | `/api/v1/info/[id]` | Get single item | All users |
| POST | `/api/v1/info` | Create item | Multi-unit Manager+ |
| PATCH | `/api/v1/info/[id]` | Update item | Multi-unit Manager+ |
| DELETE | `/api/v1/info/[id]` | Delete item | Director+ |

### Info Folders

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/info/folders` | List all folders (tree) | All users |
| POST | `/api/v1/info/folders` | Create folder | Multi-unit Manager+ |
| PATCH | `/api/v1/info/folders/[id]` | Rename folder | Multi-unit Manager+ |
| DELETE | `/api/v1/info/folders/[id]` | Delete folder (must be empty) | Director+ |

### Info Tags

| Method | Path | Purpose | Access |
|--------|------|---------|--------|
| GET | `/api/v1/info/tags` | List all tags | All users |
| POST | `/api/v1/info/tags` | Create tag | Director+ (admin) |
| DELETE | `/api/v1/info/tags/[id]` | Delete tag | Director+ (admin) |

### Create Item — Request Body

```json
{
  "title": "Food Safety Training Video",
  "url": "https://training.example.com/food-safety",
  "description": "Required annual food safety certification course",
  "folderId": "clx...",
  "tagIds": ["clx...", "clx..."]
}
```

---

## 5. UI/UX

### 5.1 Main Info Page (`/info`)

Single-panel file browser layout:

- **Navigation bar**: "Back" button (go up one level) + "Main" button (go to root) + breadcrumbs showing current path (e.g. "Info > Operations > Food Safety")
- **Filter row**: Tag filter (multi-select chips from predefined list) + search bar
- **Content area**: Mixed list of folders and items at the current level
  - **Folder cards**: Folder icon + name, tap to drill in
  - **Item cards**: Title, description preview (truncated), URL (truncated, muted), tag badges. Tap opens link in new tab.
- **Empty state**: "No items in this folder" or "No items match your search"
- **FAB**: Circle + button, bottom-right. Opens create sheet.

### 5.2 Create/Edit Sheet (bottom sheet on mobile, modal on desktop)

- Title (required)
- URL (required)
- Description (optional, textarea)
- Folder (select — shows folder tree, includes "Root" option)
- Tags (multi-select from predefined list)

### 5.3 Create Folder (small modal)

- Name (required)
- Parent folder (select — "Root" or existing top-level folder. Greyed out if current folder is already level 2)

### 5.4 Admin → Organization Settings → Info Tab

- Tag management: list of tags with "Add Tag" button and delete (x) per tag
- Simple inline add — type name, press enter/button

---

## 6. Scope Boundaries

**In v1:**
- Bookmark CRUD with folders (2 levels) and predefined tags
- Breadcrumb + back/main navigation
- Tag filter and search
- Tag management in admin settings

**Deferred:**
- File uploads (PDFs, images)
- Favorites/pinning
- Per-item visibility restrictions
- Drag-and-drop reordering
- Item analytics (click tracking)

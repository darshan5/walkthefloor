"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  FileText,
  Plus,
  ChevronRight,
  Home,
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type InfoFolder = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { children: number; items: number };
};

type InfoTag = { id: string; name: string };

type InfoItem = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  folderId: string | null;
  tags: { tag: InfoTag }[];
  createdAt: string;
};

type BreadcrumbEntry = { id: string | null; name: string };

export default function InfoPage() {
  const [folders, setFolders] = useState<InfoFolder[]>([]);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [allFolders, setAllFolders] = useState<InfoFolder[]>([]);
  const [tags, setTags] = useState<InfoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: "Info" }]);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [createType, setCreateType] = useState<"item" | "folder" | null>(null);
  const [editingItem, setEditingItem] = useState<InfoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "item" | "folder"; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [itemForm, setItemForm] = useState({
    title: "",
    url: "",
    description: "",
    folderId: "",
    tagIds: [] as string[],
  });
  const [folderForm, setFolderForm] = useState({ name: "", parentId: "" });

  const canManage = session?.permissions?.includes("documents.manage");
  const canDelete = ["Director of Operations", "Franchisee"].includes(session?.role || "");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setSession(d?.user || null));
    fetch("/api/v1/info/tags")
      .then((r) => r.json())
      .then((d) => setTags(d?.data || []));
    fetch("/api/v1/info/folders")
      .then((r) => r.json())
      .then((d) => setAllFolders(d?.data || []));
  }, []);

  useEffect(() => {
    fetchContent();
  }, [currentFolderId, selectedTagId, searchQuery]);

  async function fetchContent() {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentFolderId) params.set("folderId", currentFolderId);
    if (selectedTagId && selectedTagId !== "all") params.set("tagId", selectedTagId);
    if (searchQuery) params.set("search", searchQuery);
    const res = await fetch(`/api/v1/info?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setFolders(data.folders || []);
      setItems(data.items || []);
    }
    setLoading(false);
  }

  async function refreshAll() {
    fetchContent();
    const res = await fetch("/api/v1/info/folders");
    if (res.ok) {
      const { data } = await res.json();
      setAllFolders(data || []);
    }
  }

  function navigateToFolder(folderId: string, folderName: string) {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
  }

  function navigateBack() {
    if (breadcrumbs.length <= 1) return;
    const newCrumbs = breadcrumbs.slice(0, -1);
    setBreadcrumbs(newCrumbs);
    setCurrentFolderId(newCrumbs[newCrumbs.length - 1].id);
  }

  function navigateToRoot() {
    setBreadcrumbs([{ id: null, name: "Info" }]);
    setCurrentFolderId(null);
  }

  function navigateToBreadcrumb(index: number) {
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newCrumbs);
    setCurrentFolderId(newCrumbs[newCrumbs.length - 1].id);
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({
      title: "",
      url: "",
      description: "",
      folderId: currentFolderId || "",
      tagIds: [],
    });
    setCreateType("item");
  }

  function openEditItem(item: InfoItem) {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      url: item.url,
      description: item.description || "",
      folderId: item.folderId || "",
      tagIds: item.tags.map((t) => t.tag.id),
    });
    setCreateType("item");
  }

  function openCreateFolder() {
    setFolderForm({ name: "", parentId: currentFolderId || "" });
    setCreateType("folder");
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      title: itemForm.title,
      url: itemForm.url,
      tagIds: itemForm.tagIds,
    };
    if (itemForm.description) payload.description = itemForm.description;
    if (itemForm.folderId) payload.folderId = itemForm.folderId;
    else payload.folderId = null;

    const url = editingItem ? `/api/v1/info/${editingItem.id}` : "/api/v1/info";
    const method = editingItem ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editingItem ? "Item updated" : "Item created");
      setCreateType(null);
      refreshAll();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = { name: folderForm.name };
    if (folderForm.parentId) payload.parentId = folderForm.parentId;

    const res = await fetch("/api/v1/info/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Folder created");
      setCreateType(null);
      refreshAll();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const url =
      deleteTarget.type === "folder"
        ? `/api/v1/info/folders/${deleteTarget.id}`
        : `/api/v1/info/${deleteTarget.id}`;
    const res = await fetch(url, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      toast.success(`${deleteTarget.type === "folder" ? "Folder" : "Item"} deleted`);
      setDeleteTarget(null);
      refreshAll();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function toggleTag(tagId: string) {
    setItemForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }));
  }

  const topLevelFolders = allFolders.filter((f) => !f.parentId);
  const currentDepth = breadcrumbs.length - 1;
  const canCreateSubfolder = currentDepth < 2;

  return (
    <div className="space-y-4 pb-20">
      {/* Header + Navigation */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Info</h1>
      </div>

      {/* Breadcrumbs + Back/Main */}
      <div className="flex items-center gap-2 flex-wrap">
        {currentFolderId && (
          <>
            <Button variant="outline" size="sm" onClick={navigateToRoot}>
              <Home className="mr-1 h-3 w-3" />
              Main
            </Button>
            <Button variant="outline" size="sm" onClick={navigateBack}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back
            </Button>
          </>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`hover:text-foreground transition-colors ${i === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap items-center">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTagId === tag.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? "" : tag.id)}
              >
                {tag.name}
                {selectedTagId === tag.id && <X className="ml-1 h-3 w-3" />}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : folders.length === 0 && items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
            {searchQuery
              ? "No items match your search."
              : selectedTagId
                ? "No items with this tag."
                : "This folder is empty."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Folders */}
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigateToFolder(folder.id, folder.name)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {folder._count.children > 0 && `${folder._count.children} folder${folder._count.children !== 1 ? "s" : ""}`}
                      {folder._count.children > 0 && folder._count.items > 0 && ", "}
                      {folder._count.items > 0 && `${folder._count.items} item${folder._count.items !== 1 ? "s" : ""}`}
                      {folder._count.children === 0 && folder._count.items === 0 && "Empty"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt("Rename folder:", folder.name);
                        if (newName && newName !== folder.name) {
                          fetch(`/api/v1/info/folders/${folder.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: newName }),
                          }).then(() => { refreshAll(); toast.success("Folder renamed"); });
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: "folder", id: folder.id, name: folder.name });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Items */}
          {items.map((item) => (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                      {item.url}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {item.tags.map((t) => (
                          <Badge key={t.tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </a>
                  <div className="flex gap-1 shrink-0">
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      {canManage && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 md:bottom-6">
          <button
            onClick={openCreateItem}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="Add item"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Create/Edit Item Sheet */}
      <Sheet open={createType === "item"} onOpenChange={(open) => !open && setCreateType(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? "Edit Item" : "New Item"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveItem} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="e.g. Food Safety Training"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL *</label>
              <Input
                type="url"
                value={itemForm.url}
                onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Folder</label>
              <Select
                value={itemForm.folderId || "root"}
                onValueChange={(v) => setItemForm({ ...itemForm, folderId: v === "root" ? "" : (v || "") })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {itemForm.folderId
                      ? (() => {
                          const f = allFolders.find((x) => x.id === itemForm.folderId);
                          if (!f) return "Root (no folder)";
                          const parent = f.parentId ? allFolders.find((x) => x.id === f.parentId) : null;
                          return parent ? `${parent.name} / ${f.name}` : f.name;
                        })()
                      : "Root (no folder)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (no folder)</SelectItem>
                  {topLevelFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                  {allFolders
                    .filter((f) => f.parentId)
                    .map((f) => {
                      const parent = allFolders.find((p) => p.id === f.parentId);
                      return (
                        <SelectItem key={f.id} value={f.id}>
                          {parent?.name} / {f.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            {tags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={itemForm.tagIds.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={saving || !itemForm.title || !itemForm.url}>
                {saving ? "Saving..." : editingItem ? "Update" : "Create"}
              </Button>
              {canCreateSubfolder && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateType(null);
                    setTimeout(openCreateFolder, 100);
                  }}
                >
                  <FolderOpen className="mr-1 h-4 w-4" />
                  New Folder
                </Button>
              )}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Create Folder Dialog */}
      <Dialog open={createType === "folder"} onOpenChange={(open) => !open && setCreateType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={folderForm.name}
                onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                placeholder="Folder name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Parent Folder</label>
              <Select
                value={folderForm.parentId || "root"}
                onValueChange={(v) => setFolderForm({ ...folderForm, parentId: v === "root" ? "" : (v || "") })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {folderForm.parentId
                      ? allFolders.find((x) => x.id === folderForm.parentId)?.name || "Root (top level)"
                      : "Root (top level)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (top level)</SelectItem>
                  {topLevelFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !folderForm.name}>
                {saving ? "Creating..." : "Create Folder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type === "folder" ? "Folder" : "Item"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
            {deleteTarget?.type === "folder" && " The folder must be empty."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Shield, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

type Session = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  role: string;
  organizationId: string;
  homeLocationId: string | null;
  locationIds: string[];
  appAccess: string[];
};

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u) {
          setSession(u);
          setName(u.name || "");
          setEmail(u.email || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile() {
    if (!session) return;
    setSaving(true);
    const res = await fetch(`/api/v1/users/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated. Changes will reflect on next login.");
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to update");
    }
  }

  async function handleChangePassword() {
    if (!session || !newPassword) return;
    setSaving(true);
    const res = await fetch(`/api/v1/users/${session.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to change password");
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{getInitials(session.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{session.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{session.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{session.role}</Badge>
                {session.title && <Badge variant="outline">{session.title}</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" onClick={handleChangePassword} disabled={saving || !newPassword}>
            {saving ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Role:</span>
            <span>{session.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Locations:</span>
            <span>{session.locationIds.length} assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Modules:</span>
            <span>{session.appAccess.join(", ") || "None"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

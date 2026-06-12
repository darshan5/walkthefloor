"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SaasLogoutButton() {
  async function handleLogout() {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken }),
    });
    window.location.href = "/saas-login";
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}

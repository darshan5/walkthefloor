"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LocationSelector } from "./location-selector";

type TopBarProps = {
  user: {
    name: string;
    title?: string | null;
    role: string;
  };
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
};

export function TopBar({ user, onMenuToggle, showMenuButton }: TopBarProps) {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  async function handleSignOut() {
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken }),
    });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6">
      {showMenuButton && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="hidden md:block">
        {greeting && <span className="text-sm text-muted-foreground">{greeting}, </span>}
        <span className="text-sm font-medium">{user.name}</span>
      </div>

      <div className="hidden md:block">
        <LocationSelector />
      </div>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          0
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline">{user.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.title || user.role}</p>
          </div>
          <DropdownMenuSeparator />
          <Link href="/profile" className="block">
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </Link>
          <Link href="/admin/organization" className="block">
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </Link>
          <Link href="/support" className="block">
            <DropdownMenuItem>Support</DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <div className="cursor-pointer" onClick={handleSignOut}>
            <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LocationSelector } from "./location-selector";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    title?: string | null;
    role: string;
    appAccess?: string[];
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar appAccess={user.appAccess} />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileMenuOpen(false)}>
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <span>WalkTheFloor</span>
            </Link>
          </div>
          <div className="p-3">
            <LocationSelector />
          </div>
          <Sidebar appAccess={user.appAccess} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          user={user}
          showMenuButton
          onMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
            {children}
          </div>
        </main>

        <BottomNav appAccess={user.appAccess} />
      </div>
    </div>
  );
}

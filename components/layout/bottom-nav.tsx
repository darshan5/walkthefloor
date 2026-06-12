"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ListChecks, Wrench, AlertTriangle, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Book", href: "/checklists", icon: ClipboardCheck, appKey: "checklists" },
  { label: "Tasks", href: "/checklists/tasks", icon: ListChecks, appKey: "checklists" },
  { label: "CAs", href: "/checklists/corrective-actions", icon: AlertTriangle, appKey: "checklists" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, appKey: "maintenance" },
];

type BottomNavProps = {
  appAccess?: string[];
};

export function BottomNav({ appAccess = [] }: BottomNavProps) {
  const pathname = usePathname();

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.appKey) return true;
    return appAccess.includes(tab.appKey);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {visibleTabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs touch-target transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

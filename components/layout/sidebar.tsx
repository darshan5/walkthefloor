"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  BarChart3,
  Wrench,
  MessageSquare,
  Settings,
  FileText,
  LayoutDashboard,
  ListChecks,
  CalendarCheck,
  AlertTriangle,
  Thermometer,
  ChevronDown,
  ShieldAlert,
  TrendingUp,
  Printer,
  BarChart,
  HelpCircle,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: { label: string; href: string }[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Book", href: "/checklists", icon: ClipboardCheck, permission: "checklists" },
  { label: "Tasks", href: "/checklists/tasks", icon: ListChecks, permission: "checklists" },
  { label: "Corrective Actions", href: "/checklists/corrective-actions", icon: AlertTriangle, permission: "checklists" },
  // { label: "Audits", href: "/audits", icon: ListChecks, permission: "audits" }, // Phase 2
  { label: "Maintenance", href: "/maintenance", icon: Wrench, permission: "maintenance" },
  { label: "Guest Service", href: "/guest-service", icon: MessageSquare, permission: "guest_service" },
  { label: "Documents", href: "/documents", icon: FileText, permission: "documents" },
  {
    label: "Admin",
    href: "/admin",
    icon: Settings,
    permission: "admin",
    children: [
      { label: "Organization", href: "/admin/organization" },
      { label: "Locations", href: "/admin/locations" },
      { label: "Equipment", href: "/admin/equipment" },
      { label: "Checklists", href: "/checklists/templates" },
      { label: "Users", href: "/admin/users" },
      { label: "Shifts", href: "/admin/shifts" },
      { label: "Roles", href: "/admin/roles" },
      { label: "Devices", href: "/admin/devices" },
    ],
  },
  { label: "Support", href: "/support", icon: Headphones },
  { label: "Help", href: "/help", icon: HelpCircle },
];

type SidebarProps = {
  appAccess?: string[];
};

export function Sidebar({ appAccess = [] }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return appAccess.includes(item.permission);
  });

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <span>WalkTheFloor</span>
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="flex flex-col gap-1 p-3">
          {filteredItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              pathname={pathname}
            />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const [isOpen, setIsOpen] = useState(isActive && !!item.children);
  const Icon = item.icon;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
            isActive && "bg-sidebar-accent font-medium"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l pl-3">
            {item.children.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    childActive && "bg-sidebar-accent font-medium text-foreground"
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent font-medium"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

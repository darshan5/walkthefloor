import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Building2, Users, CreditCard, ScrollText, Settings, Shield } from "lucide-react";

const navItems = [
  { label: "Organizations", href: "/saas-admin", icon: Building2 },
  { label: "Audit Log", href: "/saas-admin/audit-log", icon: ScrollText },
  { label: "Settings", href: "/saas-admin/settings", icon: Settings },
];

export default async function SaasAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.saasAdminId) redirect("/login");

  return (
    <div className="flex h-screen">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/saas-admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm">SaaS Admin</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-6">
          <span className="text-sm text-muted-foreground">WalkTheFloor Platform Admin</span>
          <span className="text-sm font-medium">{user.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

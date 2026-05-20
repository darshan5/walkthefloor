import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  if (user.saasAdminId) redirect("/saas-admin");

  return (
    <AppShell
      user={{
        name: user.name || "User",
        title: user.title,
        role: user.role || "Team Member",
        appAccess: user.appAccess || [],
      }}
    >
      {children}
    </AppShell>
  );
}

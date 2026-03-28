import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileSidebar } from "@/components/ui/MobileSidebar";
import { SidebarNav } from "@/components/ui/SidebarNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex bg-[var(--bg-tertiary)]">
      {/* Sidebar */}
      <MobileSidebar>
        <SidebarNav userName={session.user?.name} />
      </MobileSidebar>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pt-16 md:pt-8 min-w-0 bg-[var(--bg-tertiary)]">
        {children}
      </main>
    </div>
  );
}

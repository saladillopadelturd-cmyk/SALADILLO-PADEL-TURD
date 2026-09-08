import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAdmin>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar />
        <div className="flex-1 pb-20 lg:pb-0">
          <div className="p-6 lg:p-8">{children}</div>
        </div>
        <MobileNav />
      </div>
    </AuthGuard>
  );
}

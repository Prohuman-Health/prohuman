import AdminSidebar from "@/components/admin-sidebar";
import AdminTopBar from "@/components/admin-topbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AdminSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <AdminTopBar />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

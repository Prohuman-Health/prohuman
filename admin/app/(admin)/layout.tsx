import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-[#EBEBEB] p-3 gap-3 overflow-hidden">
            {/* Floating sidebar — rounded, detached from edges */}
            <Sidebar />

            {/* Right panel — topbar + content */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-2xl bg-[#f7f7f7]">
                <TopBar />
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}

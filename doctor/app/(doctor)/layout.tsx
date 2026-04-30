"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ShieldOff, LogOut } from "lucide-react";

const ALLOWED_ROLES = ["doctor", "physiotherapist", "massager", "fitness_trainer", "admin", "super_admin"];

function AccessDenied({ email, role, onLogout }: { email: string; role: string; onLogout: () => void }) {
    return (
        <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
            <div className="text-center space-y-5 max-w-sm px-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                        <ShieldOff className="w-8 h-8 text-red-400" />
                    </div>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Access Denied</h1>
                    <p className="text-sm text-white/50 mt-2 leading-relaxed">
                        <span className="text-white/70 font-medium">{email}</span> has role{" "}
                        <span className="text-amber-400 font-mono font-semibold">{role}</span>.
                        Only <span className="text-[#2493A2] font-semibold">doctor</span> accounts can access this panel.
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                >
                    <LogOut className="w-4 h-4" /> Sign out
                </button>
            </div>
        </div>
    );
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace("/login"); return; }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
                <Loader2 className="w-8 h-8 text-[#2493A2] animate-spin" />
            </div>
        );
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
        return <AccessDenied email={user.email} role={user.role} onLogout={() => { logout(); router.replace("/login"); }} />;
    }

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — desktop: static, mobile: drawer */}
            <div className={`
                fixed inset-y-0 left-0 z-40 p-3 transition-transform duration-200
                lg:static lg:translate-x-0 lg:z-auto
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { useAuth, useInactivityLogout } from "@/lib/auth-context";
import { settingsApi } from "@/lib/api";
import { Loader2, ShieldOff, LogOut } from "lucide-react";

import { PatientsProvider } from "@/lib/contexts/patients-context";
import { SessionsProvider } from "@/lib/contexts/sessions-context";
import { StaffProvider } from "@/lib/contexts/staff-context";
import { CatalogProvider } from "@/lib/contexts/catalog-context";

// Both receptionists and admins can access the front-desk portal
const ALLOWED_ROLES = ["receptionist", "admin", "super_admin"];

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
                        <span className="text-amber-400 font-mono font-semibold">{role}</span>. Only{" "}
                        <span className="text-[#2493A2] font-semibold">receptionist</span> accounts can access this panel.
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

function AutoLogoutMonitor() {
    const { logout } = useAuth();
    const [timeoutMs, setTimeoutMs] = useState<number | undefined>(undefined);

    useEffect(() => {
        settingsApi.list().then(list => {
            const enabled = list.find(s => s.key === "session_expiry_enabled")?.value;
            const minutes = list.find(s => s.key === "session_timeout_minutes")?.value;
            if (enabled === "true" || enabled === true) {
                const mins = parseInt(String(minutes ?? "30"), 10);
                if (!isNaN(mins) && mins > 0) setTimeoutMs(mins * 60_000);
            }
        }).catch(() => { /* ignore */ });
    }, []);

    useInactivityLogout(timeoutMs, logout);
    return null;
}

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
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
        return <AccessDenied email={user.email} role={user.role} onLogout={logout} />;
    }

    return (
        <PatientsProvider>
            <SessionsProvider>
                <StaffProvider>
                    <CatalogProvider>
                        <div className="flex h-screen bg-[#EBEBEB] p-2 md:p-3 gap-2 md:gap-3 overflow-hidden">
                            {/* Mobile overlay */}
                            {sidebarOpen && (
                                <div
                                    className="fixed inset-0 z-20 bg-black/30 lg:hidden"
                                    onClick={() => setSidebarOpen(false)}
                                />
                            )}

                            {/* Sidebar */}
                            <div
                                className={`fixed lg:relative z-30 lg:z-auto h-full transition-transform duration-300 ease-in-out ${
                                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                                }`}
                            >
                                <Sidebar collapsed={false} onClose={() => setSidebarOpen(false)} />
                            </div>

                            {/* Right panel */}
                            <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-2xl bg-[#f7f7f7]">
                                <AutoLogoutMonitor />
                                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                                    {children}
                                </main>
                            </div>
                        </div>
                    </CatalogProvider>
                </StaffProvider>
            </SessionsProvider>
        </PatientsProvider>
    );
}

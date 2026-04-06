"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Mail, Menu, LogOut, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/global-search";

const PAGE_LABELS: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/doctors": "Doctors",
    "/patients": "Patients",
    "/sessions": "Sessions",
    "/calendar": "Calendar",
    "/session-types": "Session Types",
    "/forms": "Form Builder",
    "/staff": "Staff & Roles",
    "/exercises": "Exercise Directory",
    "/algorithms": "Algorithm Directory",
    "/whatsapp": "WhatsApp Messages",
    "/settings": "Settings",
};

interface TopBarProps {
    onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const pathname = usePathname();
    const label = PAGE_LABELS[pathname] ?? "Admin";
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // ⌘F / Ctrl+F opens search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    return (
        <>
        <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 md:px-6 shrink-0 gap-3 rounded-t-2xl">
            {/* Left — hamburger (mobile) + search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                <button
                    onClick={() => router.back()}
                    className="lg:hidden flex items-center gap-1 text-sm font-semibold truncate text-foreground hover:text-muted-foreground transition-colors min-w-0"
                >
                    <ChevronLeft className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{label}</span>
                </button>

                <button
                    onClick={() => setSearchOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3.5 py-2 text-sm text-muted-foreground w-56 lg:w-64 hover:bg-muted/80 transition-colors"
                >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">Search anything</span>
                    <kbd className="text-[10px] bg-white border border-border rounded-md px-1.5 py-0.5 font-mono text-muted-foreground hidden lg:block">⌘F</kbd>
                </button>

                {/* Mobile search icon */}
                <button onClick={() => setSearchOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0">
                    <Search className="w-4 h-4" />
                </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <button className="hidden sm:flex w-9 h-9 rounded-xl bg-muted items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                    <Mail className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                {/* User dropdown */}
                <div className="relative flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
                    <button
                        onClick={() => setShowMenu(v => !v)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <Avatar className="w-8 h-8">
                            {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback className="text-xs font-semibold bg-[#2493A2] text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="leading-none hidden md:block text-left">
                            <p className="text-sm font-semibold">{user?.full_name ?? "User"}</p>
                            <p className="text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
                        </div>
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-11 z-50 min-w-[180px] bg-white border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-border">
                                    <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate capitalize">{user?.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
        </>
    );
}

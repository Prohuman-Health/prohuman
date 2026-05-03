"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/global-search";

interface TopBarProps {
    onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
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
        <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 gap-3 rounded-t-2xl">
            {/* Left — hamburger (mobile) + search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                {/* Desktop search bar */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2 text-sm text-gray-400 w-56 lg:w-64 hover:bg-gray-200 transition-colors"
                >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">Search patients…</span>
                    <kbd className="text-[10px] bg-white border border-gray-200 rounded-md px-1.5 py-0.5 font-mono text-gray-400 hidden lg:block">⌘F</kbd>
                </button>

                {/* Mobile search icon */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
                >
                    <Search className="w-4 h-4" />
                </button>
            </div>

            {/* Right — user dropdown */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex items-center gap-2 pl-2 md:pl-3 border-l border-gray-100">
                    <button
                        onClick={() => setShowMenu(v => !v)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#2493A2] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {initials}
                        </div>
                        <div className="leading-none hidden md:block text-left">
                            <p className="text-sm font-semibold text-gray-900">{user?.full_name ?? "User"}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{user?.role ?? ""}</p>
                        </div>
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-11 z-50 min-w-[180px] bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-gray-100">
                                    <p className="text-xs font-semibold truncate">{user?.full_name}</p>
                                    <p className="text-[11px] text-gray-400 truncate capitalize">{user?.role}</p>
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

"use client";

import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface TopBarProps {
    onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const { user } = useAuth();

    return (
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 bg-white border-b border-gray-100">
            <button
                onClick={onMenuClick}
                className="lg:hidden w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
            >
                <Menu className="w-4 h-4" />
            </button>

            <div className="ml-auto flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#2493A2]/15 text-[#2493A2] text-xs font-bold flex items-center justify-center">
                            {user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.full_name}</span>
                    </div>
                )}
            </div>
        </header>
    );
}

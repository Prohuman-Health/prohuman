"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Mail, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PAGE_LABELS: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/doctors": "Doctors",
    "/patients": "Patients",
    "/sessions": "Sessions",
    "/calendar": "Calendar",
    "/session-types": "Session Types",
    "/forms": "Form Builder",
    "/staff": "Staff & Roles",
    "/settings": "Settings",
    "/help": "Help",
};

interface TopBarProps {
    onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const pathname = usePathname();
    const label = PAGE_LABELS[pathname] ?? "Admin";

    return (
        <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 md:px-6 shrink-0 gap-3 rounded-t-2xl">
            {/* Left — hamburger (mobile) + search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Hamburger — only on < lg */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                {/* Page title on mobile, search on md+ */}
                <p className="font-semibold text-sm truncate lg:hidden">{label}</p>

                <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3.5 py-2 text-sm text-muted-foreground w-56 lg:w-64 cursor-pointer hover:bg-muted/80 transition-colors">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">Search anything</span>
                    <kbd className="text-[10px] bg-white border border-border rounded-md px-1.5 py-0.5 font-mono text-muted-foreground hidden lg:block">⌘F</kbd>
                </div>
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

                {/* User */}
                <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs font-semibold bg-foreground text-white">AD</AvatarFallback>
                    </Avatar>
                    <div className="leading-none hidden md:block">
                        <p className="text-sm font-semibold">Admin</p>
                        <p className="text-[11px] text-muted-foreground">admin@prohuman.in</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

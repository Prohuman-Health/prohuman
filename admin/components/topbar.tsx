"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TopBar() {
    const pathname = usePathname();

    return (
        <header className="h-14 border-b border-border bg-white flex items-center justify-between px-6 shrink-0 gap-4 rounded-t-2xl">
            {/* Search */}
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3.5 py-2 text-sm text-muted-foreground w-64 cursor-pointer hover:bg-muted/80 transition-colors">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Search anything</span>
                <kbd className="text-[10px] bg-white border border-border rounded-md px-1.5 py-0.5 font-mono text-muted-foreground">⌘F</kbd>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 ml-auto">
                <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors relative">
                    <Mail className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                {/* User */}
                <div className="flex items-center gap-2.5 pl-3 border-l border-border">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs font-semibold bg-foreground text-white">AD</AvatarFallback>
                    </Avatar>
                    <div className="leading-none">
                        <p className="text-sm font-semibold">Admin</p>
                        <p className="text-[11px] text-muted-foreground">admin@prohuman.in</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

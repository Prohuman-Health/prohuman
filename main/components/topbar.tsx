"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Home, ChevronRight } from "lucide-react";

const breadcrumbMap: Record<string, string> = {
    "/": "Dashboard",
    "/calendar": "Calendar",
    "/patients": "Patients",
    "/sessions": "Sessions",
    "/activity": "Activity",
    "/settings": "Settings",
};

export default function TopBar() {
    const pathname = usePathname();
    const currentLabel = breadcrumbMap[pathname] ?? "Page";

    return (
        <header className="h-12 border-b border-border bg-white flex items-center justify-between px-6 shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                    <Home className="w-3.5 h-3.5" />
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="hover:text-foreground transition-colors cursor-pointer">Receptionist</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-medium">{currentLabel}</span>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm text-muted-foreground w-56 cursor-pointer hover:bg-muted/80 transition-colors">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Search anything</span>
                <kbd className="text-[10px] bg-white border border-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
            </div>
        </header>
    );
}

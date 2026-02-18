"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Home, ChevronRight } from "lucide-react";

const breadcrumbMap: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/doctors": "Doctors",
    "/admin/patients": "Patients",
    "/admin/sessions": "Sessions",
    "/admin/session-types": "Session Types",
    "/admin/forms": "Form Builder",
    "/admin/questions": "Question Bank",
    "/admin/staff": "Staff & Roles",
    "/admin/settings": "Settings",
};

export default function AdminTopBar() {
    const pathname = usePathname();
    const currentLabel = breadcrumbMap[pathname] ?? "Admin";

    return (
        <header className="h-12 border-b border-border bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href="/admin" className="hover:text-foreground transition-colors">
                    <Home className="w-3.5 h-3.5" />
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="hover:text-foreground transition-colors cursor-pointer">Admin</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground font-medium">{currentLabel}</span>
            </div>

            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm text-muted-foreground w-56 cursor-pointer hover:bg-muted/80 transition-colors">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Search anything</span>
                <kbd className="text-[10px] bg-white border border-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
            </div>
        </header>
    );
}

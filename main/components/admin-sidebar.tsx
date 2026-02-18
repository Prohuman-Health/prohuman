"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Stethoscope,
    CalendarClock,
    ClipboardList,
    FileText,
    HelpCircle,
    Settings,
    ShieldCheck,
    Activity,
    ChevronUp,
    ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navGroups = [
    {
        label: "OVERVIEW",
        items: [
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
            { href: "/admin/patients", label: "Patients", icon: Users },
            { href: "/admin/sessions", label: "Sessions", icon: CalendarClock },
        ],
    },
    {
        label: "CONFIGURATION",
        items: [
            { href: "/admin/session-types", label: "Session Types", icon: ClipboardList },
            { href: "/admin/forms", label: "Form Builder", icon: FileText },
            { href: "/admin/questions", label: "Question Bank", icon: HelpCircle },
        ],
    },
    {
        label: "SYSTEM",
        items: [
            { href: "/admin/staff", label: "Staff & Roles", icon: ShieldCheck },
            { href: "/admin/settings", label: "Settings", icon: Settings },
        ],
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    return (
        <aside className="w-[220px] shrink-0 h-screen bg-white border-r border-border flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
                <div className="w-7 h-7 bg-foreground rounded-md flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="font-semibold text-[15px] tracking-tight">ProHuman</span>
                    <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Admin</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="text-[10px] font-semibold text-muted-foreground tracking-widest px-2 mb-1.5">
                            {group.label}
                        </p>
                        <ul className="space-y-0.5">
                            {group.items.map(({ href, label, icon: Icon }) => {
                                const active = pathname === href;
                                return (
                                    <li key={href}>
                                        <Link
                                            href={href}
                                            className={cn(
                                                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                                                active
                                                    ? "bg-foreground text-white font-medium"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            {label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User */}
            <div className="border-t border-border px-3 py-3">
                <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                >
                    <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-muted-foreground/20">AD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">Admin</p>
                        <p className="text-[11px] text-muted-foreground truncate">Administrator</p>
                    </div>
                    {userMenuOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                </button>
            </div>
        </aside>
    );
}

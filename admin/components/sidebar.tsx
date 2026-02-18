"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Stethoscope, CalendarClock,
    ClipboardList, FileText, HelpCircle, Settings,
    ShieldCheck, LogOut, HelpCircle as Help, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/sessions", label: "Sessions", icon: CalendarClock },
    { href: "/session-types", label: "Session Types", icon: ClipboardList },
    { href: "/forms", label: "Form Builder", icon: FileText },
];

const generalItems = [
    { href: "/staff", label: "Staff & Roles", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/help", label: "Help", icon: Help },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-[220px] shrink-0 h-full bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
                <div className="w-8 h-8 bg-foreground rounded-xl flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[17px] tracking-tight">ProHuman</span>
            </div>

            {/* Menu */}
            <div className="px-4 mb-1">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-2 mb-2">Menu</p>
                <ul className="space-y-0.5">
                    {menuItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-foreground text-white shadow-sm"
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

            {/* General */}
            <div className="px-4 mt-4 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-2 mb-2">General</p>
                <ul className="space-y-0.5">
                    {generalItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-foreground text-white shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                    <li>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                            <LogOut className="w-4 h-4 shrink-0" />
                            Logout
                        </button>
                    </li>
                </ul>
            </div>

            {/* Dark promo card at bottom */}
            <div className="mx-4 mb-5 rounded-2xl bg-foreground text-white p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-sm leading-tight">ProHuman<br />Health Admin</p>
                <p className="text-[11px] text-white/60 leading-relaxed">Manage your clinic from one place.</p>
            </div>
        </aside>
    );
}

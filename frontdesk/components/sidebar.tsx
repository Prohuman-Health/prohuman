"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Stethoscope, CalendarClock, CalendarDays,
    Settings, LogOut, X, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/sessions", label: "Sessions", icon: CalendarClock },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/invoices", label: "Invoices", icon: Receipt },
];

const generalItems = [
    { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
    collapsed?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <aside className="w-[220px] shrink-0 h-full bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
            {/* Logo */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <Image
                    src="/logo.png"
                    alt="ProHuman"
                    width={140}
                    height={36}
                    className="h-9 w-auto object-contain"
                    priority
                />
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Scrollable nav area */}
            <div className="flex-1 overflow-y-auto px-4 py-1">
                {/* Menu */}
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-2 mb-2">Menu</p>
                <ul className="space-y-0.5 mb-5">
                    {menuItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-primary text-white shadow-sm"
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

                {/* General */}
                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-2 mb-2">General</p>
                <ul className="space-y-0.5">
                    {generalItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-primary text-white shadow-sm"
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
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            Logout
                        </button>
                    </li>
                </ul>
            </div>
        </aside>
    );
}

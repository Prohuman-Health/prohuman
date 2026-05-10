"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Stethoscope, CalendarClock, CalendarDays,
    ClipboardList, FileText, Settings,
    ShieldCheck, LogOut, X,
    Dumbbell, MessageCircle, BrainCircuit, ChevronDown, ChevronRight, BookOpen, Receipt, Wallet, Package, MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/sessions", label: "Sessions", icon: CalendarClock },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/session-types", label: "Session Types", icon: ClipboardList },
    { href: "/forms", label: "Form Builder", icon: FileText },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/cash", label: "Cash Register", icon: Wallet },
    { href: "/messages", label: "Messages", icon: MessagesSquare },
    { href: "/inventory", label: "Inventory", icon: Package },
];

const directoryItems = [
    { href: "/exercises", label: "Exercises", icon: Dumbbell },
    { href: "/question-directory", label: "Question Directory", icon: BookOpen },
    { href: "/whatsapp", label: "WhatsApp Messages", icon: MessageCircle },
    { href: "/algorithms", label: "Algorithms", icon: BrainCircuit },
];

const generalItems = [
    { href: "/staff", label: "Staff & Roles", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/settings/closed-days", label: "Clinic Closed Days", icon: CalendarDays },
];

interface SidebarProps {
    collapsed?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const [dirOpen, setDirOpen] = useState(true);

    const isDirectoryActive = directoryItems.some((item) => pathname === item.href);

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

                {/* Directories — collapsible */}
                <button
                    onClick={() => setDirOpen((v) => !v)}
                    className={cn(
                        "w-full flex items-center justify-between px-2 mb-2 group",
                        isDirectoryActive && !dirOpen ? "text-foreground" : ""
                    )}
                >
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase group-hover:text-foreground transition-colors">
                        Directories
                    </p>
                    {dirOpen
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    }
                </button>
                {dirOpen && (
                    <ul className="space-y-0.5 mb-5">
                        {directoryItems.map(({ href, label, icon: Icon }) => {
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
                )}

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
                        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all">
                            <LogOut className="w-4 h-4 shrink-0" />
                            Logout
                        </button>
                    </li>
                </ul>
            </div>

        </aside>
    );
}

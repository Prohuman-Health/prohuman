"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, CalendarDays, LogOut, X, ClipboardList, Users, UserCircle, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
    { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
    { href: "/schedule",   label: "My Schedule",  icon: CalendarDays },
    { href: "/calendar",   label: "Calendar",     icon: Calendar },
    { href: "/sessions",   label: "Sessions",     icon: ClipboardList },
    { href: "/patients",   label: "Patients",     icon: Users },
    { href: "/profile",    label: "My Profile",   icon: UserCircle },
];

interface SidebarProps {
    onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    function initials(name: string) {
        return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    }

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
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-4 py-1">
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-2 mb-2">Menu</p>
                <ul className="space-y-0.5">
                    {menuItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(href + "/");
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                        active
                                            ? "bg-[#2493A2] text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
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

            {/* User + logout */}
            <div className="px-4 pb-5 pt-2 border-t border-gray-100">
                {user && (
                    <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-[#2493A2]/15 text-[#2493A2] text-xs font-bold flex items-center justify-center shrink-0">
                            {initials(user.full_name)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{user.full_name}</p>
                            <p className="text-[10px] text-gray-400 truncate capitalize">{user.role.replace("_", " ")}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => { logout(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}

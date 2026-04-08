"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Mail, Menu, LogOut, ChevronLeft, CheckCheck, Inbox } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/global-search";
import { inboxApi, type InAppNotification, type InboxCounts } from "@/lib/api";

const PAGE_LABELS: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/patients": "Patients",
    "/sessions": "Sessions",
    "/calendar": "Calendar",
    "/settings": "Settings",
};

const NOTIF_COLORS: Record<string, string> = {
    session_completed:   "bg-emerald-50 border-emerald-200 text-emerald-700",
    session_no_show:     "bg-red-50 border-red-200 text-red-700",
    session_late_cancel: "bg-orange-50 border-orange-200 text-orange-700",
    session_cancelled:   "bg-slate-50 border-slate-200 text-slate-600",
    session_scheduled:   "bg-blue-50 border-blue-200 text-blue-700",
    appointment_request: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function typeLabel(type: string) {
    const map: Record<string, string> = {
        session_completed:   "Completed",
        session_no_show:     "No-Show",
        session_late_cancel: "Late Cancel",
        session_cancelled:   "Cancelled",
        session_scheduled:   "Scheduled",
        appointment_request: "Request",
    };
    return map[type] ?? type;
}

function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface InboxPanelProps {
    title: string;
    items: InAppNotification[];
    loading: boolean;
    onMarkRead: (id: string) => void;
    onMarkAll: () => void;
}

function InboxPanel({ title, items, loading, onMarkRead, onMarkAll }: InboxPanelProps) {
    const unreadCount = items.filter(n => !n.is_read).length;
    return (
        <div className="absolute right-0 top-11 z-50 w-80 bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">{title}</span>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAll}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                    </button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {loading && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                )}
                {!loading && items.length === 0 && (
                    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="w-8 h-8 opacity-30" />
                        <span className="text-sm">All caught up</span>
                    </div>
                )}
                {!loading && items.map(n => (
                    <button
                        key={n.id}
                        onClick={() => !n.is_read && onMarkRead(n.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${n.is_read ? "opacity-60" : ""}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] leading-snug ${n.is_read ? "font-normal" : "font-semibold"}`}>
                                {n.title}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 mt-0.5 ${NOTIF_COLORS[n.type] ?? "bg-muted border-border"}`}>
                                {typeLabel(n.type)}
                            </span>
                        </div>
                        {n.body && (
                            <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{relativeTime(n.created_at)}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

interface TopBarProps {
    onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const pathname = usePathname();
    const label = PAGE_LABELS[pathname] ?? "Front Desk";
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const [showMail, setShowMail] = useState(false);
    const [showBell, setShowBell] = useState(false);
    const [mailItems, setMailItems] = useState<InAppNotification[]>([]);
    const [bellItems, setBellItems] = useState<InAppNotification[]>([]);
    const [counts, setCounts] = useState<InboxCounts>({ mail: 0, notifications: 0 });
    const [loadingMail, setLoadingMail] = useState(false);
    const [loadingBell, setLoadingBell] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshCounts = useCallback(async () => {
        try { setCounts(await inboxApi.counts()); } catch { /* silent */ }
    }, []);

    useEffect(() => {
        refreshCounts();
        pollRef.current = setInterval(refreshCounts, 30_000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [refreshCounts]);

    const openMail = async () => {
        setShowBell(false);
        setShowMail(v => !v);
        if (!showMail) {
            setLoadingMail(true);
            try {
                const res = await inboxApi.list("mail");
                setMailItems(res?.notifications ?? []);
            } catch { /* silent */ } finally { setLoadingMail(false); }
        }
    };

    const openBell = async () => {
        setShowMail(false);
        setShowBell(v => !v);
        if (!showBell) {
            setLoadingBell(true);
            try {
                const res = await inboxApi.list("notifications");
                setBellItems(res?.notifications ?? []);
            } catch { /* silent */ } finally { setLoadingBell(false); }
        }
    };

    const handleMarkMailRead = async (id: string) => {
        await inboxApi.markRead(id);
        setMailItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setCounts(c => ({ ...c, mail: Math.max(0, c.mail - 1) }));
    };

    const handleMarkAllMailRead = async () => {
        await inboxApi.markAllRead("mail");
        setMailItems(prev => prev.map(n => ({ ...n, is_read: true })));
        setCounts(c => ({ ...c, mail: 0 }));
    };

    const handleMarkBellRead = async (id: string) => {
        await inboxApi.markRead(id);
        setBellItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setCounts(c => ({ ...c, notifications: Math.max(0, c.notifications - 1) }));
    };

    const handleMarkAllBellRead = async () => {
        await inboxApi.markAllRead("notifications");
        setBellItems(prev => prev.map(n => ({ ...n, is_read: true })));
        setCounts(c => ({ ...c, notifications: 0 }));
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const handleLogout = () => {
        logout();
        router.replace("/login");
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    return (
        <>
        <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 md:px-6 shrink-0 gap-3 rounded-t-2xl">
            {/* Left */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                <button
                    onClick={() => router.back()}
                    className="lg:hidden flex items-center gap-1 text-sm font-semibold truncate text-foreground hover:text-muted-foreground transition-colors min-w-0"
                >
                    <ChevronLeft className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{label}</span>
                </button>

                <button
                    onClick={() => setSearchOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3.5 py-2 text-sm text-muted-foreground w-56 lg:w-64 hover:bg-muted/80 transition-colors"
                >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">Search anything</span>
                    <kbd className="text-[10px] bg-white border border-border rounded-md px-1.5 py-0.5 font-mono text-muted-foreground hidden lg:block">⌘F</kbd>
                </button>

                <button onClick={() => setSearchOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0">
                    <Search className="w-4 h-4" />
                </button>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {/* Mail */}
                <div className="relative hidden sm:block">
                    <button
                        onClick={openMail}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors relative"
                    >
                        <Mail className="w-4 h-4" />
                        {counts.mail > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                    </button>
                    {showMail && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMail(false)} />
                            <div className="relative z-50">
                                <InboxPanel
                                    title="Appointment Requests"
                                    items={mailItems}
                                    loading={loadingMail}
                                    onMarkRead={handleMarkMailRead}
                                    onMarkAll={handleMarkAllMailRead}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Bell */}
                <div className="relative">
                    <button
                        onClick={openBell}
                        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors relative"
                    >
                        <Bell className="w-4 h-4" />
                        {counts.notifications > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                        )}
                    </button>
                    {showBell && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowBell(false)} />
                            <div className="relative z-50">
                                <InboxPanel
                                    title="Notifications"
                                    items={bellItems}
                                    loading={loadingBell}
                                    onMarkRead={handleMarkBellRead}
                                    onMarkAll={handleMarkAllBellRead}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* User dropdown */}
                <div className="relative flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
                    <button
                        onClick={() => setShowMenu(v => !v)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <Avatar className="w-8 h-8">
                            {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback className="text-xs font-semibold bg-[#2493A2] text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="leading-none hidden md:block text-left">
                            <p className="text-sm font-semibold">{user?.full_name ?? "User"}</p>
                            <p className="text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
                        </div>
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-11 z-50 min-w-[180px] bg-white border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-border">
                                    <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate capitalize">{user?.role}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
        </>
    );
}

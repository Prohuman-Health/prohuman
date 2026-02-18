"use client";

import { Plus, ArrowUpRight, TrendingUp, AlertCircle, Users, Stethoscope, CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATS = [
    { label: "Total Patients", value: "142", sub: "Increased from last month", icon: ArrowUpRight, filled: true },
    { label: "Active Doctors", value: "6", sub: "Increased from last month", icon: ArrowUpRight, filled: false },
    { label: "Sessions This Month", value: "318", sub: "Increased from last month", icon: ArrowUpRight, filled: false },
    { label: "Session Types", value: "6", sub: "4 with forms assigned", icon: ArrowUpRight, filled: false },
];

const WEEK_DATA = [
    { day: "S", value: 30 },
    { day: "M", value: 75 },
    { day: "T", value: 55 },
    { day: "W", value: 90 },
    { day: "T", value: 45 },
    { day: "F", value: 60 },
    { day: "S", value: 20 },
];

const TEAM = [
    { name: "Sara Rodrigues", task: "Managing patient intake", status: "active", initials: "SR" },
    { name: "Riya Patel", task: "Front desk scheduling", status: "active", initials: "RP" },
    { name: "Amit Kulkarni", task: "System configuration", status: "active", initials: "AK" },
    { name: "Neha Gupta", task: "Patient follow-ups", status: "inactive", initials: "NG" },
];

const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-amber-100 text-amber-700",
};

const RECENT_SESSIONS = [
    { patient: "Aisha Mehta", type: "Initial Evaluation", due: "Feb 18, 2025", color: "bg-violet-500" },
    { patient: "Rohan Kapoor", type: "Follow-Up Session", due: "Feb 18, 2025", color: "bg-blue-500" },
    { patient: "Sunita Rao", type: "Follow-Up Session", due: "Feb 19, 2025", color: "bg-emerald-500" },
    { patient: "Meena Joshi", type: "Initial Evaluation", due: "Feb 20, 2025", color: "bg-amber-500" },
    { patient: "Deepak Verma", type: "Discharge Assessment", due: "Feb 21, 2025", color: "bg-pink-500" },
];

const maxVal = Math.max(...WEEK_DATA.map((d) => d.value));

export default function DashboardPage() {
    const completionPct = 67;
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (completionPct / 100) * circumference;

    return (
        <div className="p-6 space-y-5 max-w-[1200px]">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your clinic — patients, doctors, and sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" className="gap-1.5 rounded-xl">
                        <Plus className="w-4 h-4" /> Add Session
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl">
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
                {STATS.map((s, i) => (
                    <div
                        key={s.label}
                        className={cn(
                            "rounded-2xl p-5 flex flex-col gap-3 border",
                            s.filled
                                ? "bg-foreground text-white border-foreground"
                                : "bg-white border-border"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <p className={cn("text-sm font-medium", s.filled ? "text-white/70" : "text-muted-foreground")}>
                                {s.label}
                            </p>
                            <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center", s.filled ? "border-white/30" : "border-border")}>
                                <ArrowUpRight className={cn("w-3.5 h-3.5", s.filled ? "text-white" : "text-muted-foreground")} />
                            </div>
                        </div>
                        <p className={cn("text-4xl font-bold tracking-tight", s.filled ? "text-white" : "text-foreground")}>
                            {s.value}
                        </p>
                        <p className={cn("text-[11px] flex items-center gap-1", s.filled ? "text-white/60" : "text-muted-foreground")}>
                            <TrendingUp className="w-3 h-3" />
                            {s.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-[1fr_280px_240px] gap-4">
                {/* Bar chart */}
                <div className="bg-white rounded-2xl border border-border p-5">
                    <h2 className="font-semibold text-base mb-4">Session Analytics</h2>
                    <div className="flex items-end gap-3 h-36">
                        {WEEK_DATA.map((d, i) => {
                            const heightPct = (d.value / maxVal) * 100;
                            const isMax = d.value === maxVal;
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    {isMax && (
                                        <span className="text-[10px] font-semibold text-foreground">{d.value}%</span>
                                    )}
                                    <div className="w-full flex items-end" style={{ height: "100px" }}>
                                        <div
                                            className={cn(
                                                "w-full rounded-full transition-all",
                                                isMax ? "bg-foreground" : i % 2 === 0 ? "bg-muted" : "bg-muted-foreground/20"
                                            )}
                                            style={{ height: `${heightPct}%`, minHeight: "12px" }}
                                        />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">{d.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming session */}
                <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-base">Next Session</h2>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 bg-muted rounded-xl p-4 space-y-2">
                        <p className="font-bold text-lg leading-tight">Morning Clinic<br />Block</p>
                        <p className="text-xs text-muted-foreground">Time: 09:00 AM – 01:00 PM</p>
                    </div>
                    <Button className="w-full rounded-xl gap-2" size="sm">
                        <CalendarDays className="w-4 h-4" />
                        View Calendar
                    </Button>
                </div>

                {/* Recent sessions list */}
                <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-base">Sessions</h2>
                        <button className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">+ New</button>
                    </div>
                    <div className="space-y-3 flex-1">
                        {RECENT_SESSIONS.map((s, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                                <div className={cn("w-2 h-2 rounded-full shrink-0", s.color)} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{s.patient}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{s.due}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-[1fr_1fr_240px] gap-4">
                {/* Team */}
                <div className="bg-white rounded-2xl border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-base">Staff</h2>
                        <button className="text-[11px] border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Member
                        </button>
                    </div>
                    <div className="space-y-3">
                        {TEAM.map((m, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                    {m.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{m.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{m.task}</p>
                                </div>
                                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[m.status])}>
                                    {m.status === "active" ? "Active" : "Away"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress */}
                <div className="bg-white rounded-2xl border border-border p-5">
                    <h2 className="font-semibold text-base mb-4">Monthly Progress</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                                <circle
                                    cx="60" cy="60" r="54" fill="none"
                                    stroke="currentColor" strokeWidth="12"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    className="text-foreground transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold">{completionPct}%</span>
                                <span className="text-[10px] text-muted-foreground">Sessions Done</span>
                            </div>
                        </div>
                        <div className="w-full space-y-2">
                            {[
                                { label: "Completed", pct: 67, color: "bg-foreground" },
                                { label: "Pending", pct: 22, color: "bg-muted-foreground/30" },
                                { label: "No-Show", pct: 11, color: "bg-red-200" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-2 text-xs">
                                    <div className={cn("w-2 h-2 rounded-full shrink-0", item.color)} />
                                    <span className="text-muted-foreground flex-1">{item.label}</span>
                                    <span className="font-medium">{item.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dark time/alert card */}
                <div className="bg-foreground text-white rounded-2xl p-5 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-white/70">Today's Alerts</p>
                    <div className="flex-1 space-y-3">
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xs font-medium">Dr. Meera Iyer</p>
                            <p className="text-[11px] text-white/60 mt-0.5">Unavailable tomorrow</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xs font-medium">3 Forms Unassigned</p>
                            <p className="text-[11px] text-white/60 mt-0.5">Session types need forms</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold tracking-tight tabular-nums">
                            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </p>
                        <p className="text-[11px] text-white/50 mt-0.5">Current Time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

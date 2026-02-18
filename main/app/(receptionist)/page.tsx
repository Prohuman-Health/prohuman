"use client";

import { CalendarDays, Users, Clock, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
    { label: "Today's Sessions", value: "8", sub: "4 completed · 4 upcoming", icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Patients", value: "142", sub: "+3 new this week", icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Avg. Wait Time", value: "12 min", sub: "Down from 18 min", icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Completion Rate", value: "94%", sub: "This month", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50" },
];

const TODAY_SESSIONS = [
    { time: "09:00", patient: "Aisha Mehta", type: "Initial Evaluation", doctor: "Dr. Priya Sharma", status: "completed" },
    { time: "10:00", patient: "Rohan Kapoor", type: "Follow-Up Session", doctor: "Dr. Arjun Nair", status: "completed" },
    { time: "11:00", patient: "Sunita Rao", type: "Follow-Up Session", doctor: "Dr. Priya Sharma", status: "in-progress" },
    { time: "13:00", patient: "Vikram Singh", type: "Discharge Assessment", doctor: "Dr. Arjun Nair", status: "upcoming" },
    { time: "14:00", patient: "Meena Joshi", type: "Initial Evaluation", doctor: "Dr. Priya Sharma", status: "upcoming" },
    { time: "15:00", patient: "Deepak Verma", type: "Follow-Up Session", doctor: "Dr. Arjun Nair", status: "upcoming" },
];

const ALERTS = [
    { message: "Kavya Reddy missed her 10:00 AM session", type: "no-show" },
    { message: "Dr. Meera Iyer is unavailable tomorrow — 3 sessions need rescheduling", type: "warning" },
];

export default function DashboardPage() {
    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div>
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Good morning, Sara. Here's what's happening today.</p>
            </div>

            {/* Alerts */}
            {ALERTS.length > 0 && (
                <div className="space-y-2">
                    {ALERTS.map((a, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm",
                                a.type === "no-show"
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-amber-50 border-amber-200 text-amber-700"
                            )}
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {a.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {STATS.map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-border p-4 space-y-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
                            <s.icon className={cn("w-4 h-4", s.color)} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {s.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* Today's schedule */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="font-semibold text-sm">Today's Schedule</h2>
                    <a href="/calendar" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        View calendar →
                    </a>
                </div>
                <div className="divide-y divide-border">
                    {TODAY_SESSIONS.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3">
                            <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">{s.time}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{s.patient}</p>
                                <p className="text-xs text-muted-foreground">{s.type} · {s.doctor}</p>
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                    s.status === "completed"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : s.status === "in-progress"
                                            ? "bg-blue-50 text-blue-600"
                                            : "bg-muted text-muted-foreground"
                                )}
                            >
                                {s.status === "in-progress" ? "In Progress" : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

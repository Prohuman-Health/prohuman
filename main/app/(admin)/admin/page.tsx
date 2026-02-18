"use client";

import {
    Users, Stethoscope, CalendarDays, ClipboardList,
    TrendingUp, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
    { label: "Total Doctors", value: "8", sub: "2 unavailable today", icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Total Patients", value: "142", sub: "+3 new this week", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Sessions This Month", value: "318", sub: "+12% vs last month", icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Session Types", value: "6", sub: "4 with forms assigned", icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
];

const ALERTS = [
    { message: "Dr. Meera Iyer has no availability set for next week", type: "warning" },
    { message: "3 session types have no form assigned", type: "warning" },
];

const RECENT_ACTIVITY = [
    { action: "New patient registered", detail: "Kavya Reddy · by Sara R.", time: "10 min ago" },
    { action: "Session type updated", detail: "Initial Evaluation · by Admin", time: "1 hr ago" },
    { action: "Doctor schedule changed", detail: "Dr. Arjun Nair · Mon–Fri", time: "2 hr ago" },
    { action: "New form published", detail: "Discharge Assessment Form · by Admin", time: "Yesterday" },
    { action: "Staff account created", detail: "Riya Patel · Front Desk", time: "Yesterday" },
];

const DOCTOR_LOAD = [
    { name: "Dr. Priya Sharma", sessions: 24, capacity: 30 },
    { name: "Dr. Arjun Nair", sessions: 18, capacity: 30 },
    { name: "Dr. Meera Iyer", sessions: 8, capacity: 30 },
    { name: "Dr. Kiran Das", sessions: 27, capacity: 30 },
];

export default function AdminDashboard() {
    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div>
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">System overview and clinic configuration status.</p>
            </div>

            {/* Alerts */}
            {ALERTS.length > 0 && (
                <div className="space-y-2">
                    {ALERTS.map((a, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-700 text-sm">
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

            <div className="grid grid-cols-2 gap-4">
                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                        <h2 className="font-semibold text-sm">Recent Activity</h2>
                    </div>
                    <div className="divide-y divide-border">
                        {RECENT_ACTIVITY.map((a, i) => (
                            <div key={i} className="flex items-start gap-3 px-5 py-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{a.action}</p>
                                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                                </div>
                                <span className="text-[11px] text-muted-foreground shrink-0">{a.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Doctor Load */}
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h2 className="font-semibold text-sm">Doctor Load This Month</h2>
                        <a href="/admin/doctors" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Manage →
                        </a>
                    </div>
                    <div className="p-5 space-y-4">
                        {DOCTOR_LOAD.map((d) => {
                            const pct = Math.round((d.sessions / d.capacity) * 100);
                            return (
                                <div key={d.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium">{d.name}</span>
                                        <span className="text-xs text-muted-foreground">{d.sessions}/{d.capacity} sessions</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

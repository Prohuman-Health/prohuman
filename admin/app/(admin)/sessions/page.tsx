"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SESSIONS = [
    { id: "s1", patient: "Aisha Mehta", doctor: "Dr. Priya Sharma", type: "Initial Evaluation", date: "Feb 18, 2025", time: "09:00", status: "completed" },
    { id: "s2", patient: "Rohan Kapoor", doctor: "Dr. Arjun Nair", type: "Follow-Up Session", date: "Feb 18, 2025", time: "10:00", status: "completed" },
    { id: "s3", patient: "Sunita Rao", doctor: "Dr. Priya Sharma", type: "Follow-Up Session", date: "Feb 18, 2025", time: "11:00", status: "confirmed" },
    { id: "s4", patient: "Vikram Singh", doctor: "Dr. Arjun Nair", type: "Discharge Assessment", date: "Feb 18, 2025", time: "13:00", status: "confirmed" },
    { id: "s5", patient: "Meena Joshi", doctor: "Dr. Priya Sharma", type: "Initial Evaluation", date: "Feb 19, 2025", time: "14:00", status: "confirmed" },
    { id: "s6", patient: "Deepak Verma", doctor: "Dr. Arjun Nair", type: "Follow-Up Session", date: "Feb 20, 2025", time: "09:30", status: "pending" },
    { id: "s7", patient: "Kavya Reddy", doctor: "Dr. Priya Sharma", type: "Group Therapy", date: "Feb 17, 2025", time: "15:00", status: "no-show" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    confirmed: { label: "Confirmed", cls: "border-blue-200 text-blue-700 bg-blue-50" },
    pending: { label: "Pending", cls: "border-amber-200 text-amber-700 bg-amber-50" },
    "no-show": { label: "No-Show", cls: "border-red-200 text-red-600 bg-red-50" },
    cancelled: { label: "Cancelled", cls: "border-muted-foreground/20 text-muted-foreground" },
};

const FILTERS = ["All", "Confirmed", "Completed", "Pending", "No-Show"];

export default function SessionsPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    const filtered = SESSIONS.filter((s) => {
        const matchSearch = s.patient.toLowerCase().includes(search.toLowerCase()) || s.doctor.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "All" || s.status === filter.toLowerCase().replace(" ", "-");
        return matchSearch && matchFilter;
    });

    return (
        <div className="flex flex-col h-full gap-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Track all clinic sessions and their statuses.</p>
                </div>
                <button className="flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-white transition-colors bg-white">
                    <Filter className="w-3.5 h-3.5" /> Filter
                </button>
            </div>

            {/* Search + Filter tabs */}
            <div className="flex items-center gap-3">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search sessions..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", filter === f ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {f}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{filtered.length} sessions</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden flex-1">
                <table className="w-full text-sm">
                    <thead className="border-b border-border/60">
                        <tr>
                            {["Patient", "Doctor", "Session Type", "Date", "Time", "Status", "Actions"].map((h) => (
                                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s) => {
                            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.cancelled;
                            return (
                                <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer">
                                    <td className="px-5 py-3.5 font-medium">{s.patient}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{s.doctor}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{s.type}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{s.date}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground font-mono">{s.time}</td>
                                    <td className="px-5 py-3.5">
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium", cfg.cls)}>{cfg.label}</Badge>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">View</button>
                                            <button className="text-xs text-red-500 hover:text-red-700 transition-colors">Cancel</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

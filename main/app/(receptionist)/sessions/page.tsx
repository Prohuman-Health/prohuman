"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SESSIONS = [
    { id: "s1", patient: "Aisha Mehta", doctor: "Dr. Priya Sharma", type: "Initial Evaluation", date: "2025-02-18", time: "09:00", status: "completed" },
    { id: "s2", patient: "Rohan Kapoor", doctor: "Dr. Arjun Nair", type: "Follow-Up Session", date: "2025-02-18", time: "10:00", status: "completed" },
    { id: "s3", patient: "Sunita Rao", doctor: "Dr. Priya Sharma", type: "Follow-Up Session", date: "2025-02-18", time: "11:00", status: "confirmed" },
    { id: "s4", patient: "Vikram Singh", doctor: "Dr. Arjun Nair", type: "Discharge Assessment", date: "2025-02-18", time: "13:00", status: "confirmed" },
    { id: "s5", patient: "Meena Joshi", doctor: "Dr. Priya Sharma", type: "Initial Evaluation", date: "2025-02-19", time: "14:00", status: "confirmed" },
    { id: "s6", patient: "Deepak Verma", doctor: "Dr. Arjun Nair", type: "Follow-Up Session", date: "2025-02-20", time: "09:30", status: "pending" },
    { id: "s7", patient: "Kavya Reddy", doctor: "Dr. Priya Sharma", type: "Group Therapy", date: "2025-02-17", time: "15:00", status: "no-show" },
];

const STATUS_STYLES: Record<string, string> = {
    completed: "border-emerald-300 text-emerald-600 bg-emerald-50",
    confirmed: "border-blue-300 text-blue-600 bg-blue-50",
    pending: "border-amber-300 text-amber-600 bg-amber-50",
    "no-show": "border-red-300 text-red-600 bg-red-50",
    cancelled: "border-muted-foreground/30 text-muted-foreground",
};

export default function SessionsPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    const filters = ["All", "Confirmed", "Completed", "Pending", "No-Show"];

    const filtered = SESSIONS.filter((s) => {
        const matchSearch =
            s.patient.toLowerCase().includes(search.toLowerCase()) ||
            s.doctor.toLowerCase().includes(search.toLowerCase()) ||
            s.type.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "All" || s.status.toLowerCase() === filter.toLowerCase();
        return matchSearch && matchFilter;
    });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
                <h1 className="text-xl font-semibold">Sessions</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search sessions..."
                            className="pl-8 text-sm w-56"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors">
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-white shrink-0">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                            filter === f
                                ? "bg-foreground text-white"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {f}
                    </button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">{filtered.length} sessions</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-border z-10">
                        <tr>
                            {["Patient", "Doctor", "Session Type", "Date", "Time", "Status", "Actions"].map((h) => (
                                <th
                                    key={h}
                                    className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s) => (
                            <tr key={s.id} className="border-b border-border hover:bg-muted/40 transition-colors cursor-pointer">
                                <td className="px-4 py-3 font-medium">{s.patient}</td>
                                <td className="px-4 py-3 text-muted-foreground">{s.doctor}</td>
                                <td className="px-4 py-3 text-muted-foreground">{s.type}</td>
                                <td className="px-4 py-3 text-muted-foreground">{s.date}</td>
                                <td className="px-4 py-3 text-muted-foreground font-mono">{s.time}</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLES[s.status])}>
                                        {s.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                            Reschedule
                                        </button>
                                        <span className="text-border">·</span>
                                        <button className="text-xs text-red-500 hover:text-red-700 transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

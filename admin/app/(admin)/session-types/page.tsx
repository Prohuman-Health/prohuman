"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SESSION_TYPES = [
    { id: "st1", name: "Initial Evaluation", duration: 60, color: "#6366f1", formAssigned: "Initial Intake Form", status: "active" },
    { id: "st2", name: "Follow-Up Session", duration: 45, color: "#10b981", formAssigned: "Follow-Up Notes", status: "active" },
    { id: "st3", name: "Discharge Assessment", duration: 60, color: "#f59e0b", formAssigned: "Discharge Form", status: "active" },
    { id: "st4", name: "Group Therapy", duration: 90, color: "#3b82f6", formAssigned: "None", status: "active" },
    { id: "st5", name: "Home Exercise Review", duration: 30, color: "#ec4899", formAssigned: "None", status: "draft" },
    { id: "st6", name: "Post-Surgical Rehab", duration: 75, color: "#8b5cf6", formAssigned: "Surgical Rehab Form", status: "active" },
];

export default function SessionTypesPage() {
    const [search, setSearch] = useState("");
    const filtered = SESSION_TYPES.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Session Types</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Define the types of sessions offered at your clinic.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl">
                    <Plus className="w-4 h-4" /> New Type
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search session types..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-3 gap-4">
                {filtered.map((s) => (
                    <div key={s.id} className="bg-white rounded-2xl p-5 space-y-4 hover:shadow-sm transition-shadow">
                        {/* Top row */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color + "20" }}>
                                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.color }} />
                                </div>
                                <p className="font-semibold text-sm leading-tight">{s.name}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Duration</span>
                                <span className="font-semibold">{s.duration} min</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Form</span>
                                <span className={cn("font-semibold", s.formAssigned === "None" ? "text-red-500" : "text-foreground")}>
                                    {s.formAssigned}
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                s.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground"
                            )}>
                                {s.status}
                            </Badge>
                            {s.formAssigned === "None" && (
                                <button className="text-[11px] text-blue-600 hover:underline font-medium">Assign Form →</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

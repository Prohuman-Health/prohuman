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

    const filtered = SESSION_TYPES.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
                <div>
                    <h1 className="text-xl font-semibold">Session Types</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Define the types of sessions offered at your clinic.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-8 text-sm w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Button size="sm" className="gap-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" /> New Type
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-3 gap-4">
                    {filtered.map((s) => (
                        <div key={s.id} className="bg-white border border-border rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                    <p className="font-semibold text-sm">{s.name}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1 text-muted-foreground hover:text-red-500 transition-colors rounded">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Duration</span>
                                    <span className="font-medium text-foreground">{s.duration} min</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Form</span>
                                    <span className={cn("font-medium", s.formAssigned === "None" ? "text-red-500" : "text-foreground")}>
                                        {s.formAssigned}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <Badge variant="outline" className={cn("text-[10px]",
                                    s.status === "active" ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-muted-foreground/30 text-muted-foreground"
                                )}>
                                    {s.status}
                                </Badge>
                                {s.formAssigned === "None" && (
                                    <button className="text-[11px] text-blue-600 hover:underline">Assign Form →</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Eye, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FORMS = [
    { id: "f1", name: "Initial Intake Form", sessionType: "Initial Evaluation", questions: 12, lastUpdated: "Feb 10, 2025", status: "published" },
    { id: "f2", name: "Follow-Up Notes", sessionType: "Follow-Up Session", questions: 6, lastUpdated: "Feb 05, 2025", status: "published" },
    { id: "f3", name: "Discharge Form", sessionType: "Discharge Assessment", questions: 9, lastUpdated: "Jan 28, 2025", status: "published" },
    { id: "f4", name: "Surgical Rehab Form", sessionType: "Post-Surgical Rehab", questions: 15, lastUpdated: "Feb 01, 2025", status: "published" },
    { id: "f5", name: "Pain Assessment Draft", sessionType: "Unassigned", questions: 4, lastUpdated: "Feb 15, 2025", status: "draft" },
];

const TYPE_COLORS: Record<string, string> = {
    "Initial Evaluation": "bg-violet-100 text-violet-700",
    "Follow-Up Session": "bg-emerald-100 text-emerald-700",
    "Discharge Assessment": "bg-amber-100 text-amber-700",
    "Post-Surgical Rehab": "bg-blue-100 text-blue-700",
    "Unassigned": "bg-muted text-muted-foreground",
};

export default function FormsPage() {
    const [search, setSearch] = useState("");
    const filtered = FORMS.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Create and manage intake forms for each session type.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl">
                    <Plus className="w-4 h-4" /> New Form
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search forms..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="border-b border-border/60">
                        <tr>
                            {["Form Name", "Session Type", "Questions", "Last Updated", "Status", "Actions"].map((h) => (
                                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((f) => (
                            <tr key={f.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-4 font-semibold">{f.name}</td>
                                <td className="px-5 py-4">
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", TYPE_COLORS[f.sessionType] ?? "bg-muted text-muted-foreground")}>
                                        {f.sessionType}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-center text-muted-foreground font-medium">{f.questions}</td>
                                <td className="px-5 py-4 text-muted-foreground">{f.lastUpdated}</td>
                                <td className="px-5 py-4">
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                        f.status === "published" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground"
                                    )}>
                                        {f.status}
                                    </Badge>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
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

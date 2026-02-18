"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STAFF = [
    { id: "st1", name: "Sara Rodrigues", role: "Receptionist", email: "sara.r@prohuman.in", phone: "+91 98765 11111", status: "active", lastLogin: "Today, 9:02 AM", initials: "SR" },
    { id: "st2", name: "Riya Patel", role: "Front Desk", email: "riya.p@prohuman.in", phone: "+91 87654 22222", status: "active", lastLogin: "Today, 8:45 AM", initials: "RP" },
    { id: "st3", name: "Amit Kulkarni", role: "Admin", email: "amit.k@prohuman.in", phone: "+91 76543 33333", status: "active", lastLogin: "Yesterday", initials: "AK" },
    { id: "st4", name: "Neha Gupta", role: "Receptionist", email: "neha.g@prohuman.in", phone: "+91 65432 44444", status: "inactive", lastLogin: "1 week ago", initials: "NG" },
];

const ROLE_CONFIG: Record<string, string> = {
    Admin: "bg-violet-100 text-violet-700",
    Receptionist: "bg-blue-100 text-blue-700",
    "Front Desk": "bg-amber-100 text-amber-700",
};

const AVATAR_COLORS = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700"];

export default function StaffPage() {
    const [search, setSearch] = useState("");
    const filtered = STAFF.filter(
        (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Staff & Roles</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage staff accounts and their access levels.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl">
                    <Plus className="w-4 h-4" /> Add Staff
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search staff..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="border-b border-border/60">
                        <tr>
                            {["Name", "Role", "Email", "Phone", "Last Login", "Status", "Actions"].map((h) => (
                                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s, i) => (
                            <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                            {s.initials}
                                        </div>
                                        <span className="font-semibold">{s.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", ROLE_CONFIG[s.role] ?? "bg-muted text-muted-foreground")}>
                                        {s.role}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-muted-foreground">{s.email}</td>
                                <td className="px-5 py-4 text-muted-foreground">{s.phone}</td>
                                <td className="px-5 py-4 text-muted-foreground text-xs">{s.lastLogin}</td>
                                <td className="px-5 py-4">
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                        s.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground"
                                    )}>
                                        {s.status}
                                    </Badge>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
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

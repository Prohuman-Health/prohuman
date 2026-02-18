"use client";

import { useState } from "react";
import { Search, Plus, ChevronRight, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PATIENTS = [
    {
        id: "p1",
        name: "Aisha Mehta",
        age: 34,
        gender: "Female",
        phone: "+91 98765 43210",
        complaints: "Lower back pain, difficulty walking",
        sessions: 5,
        lastVisit: "2025-02-17",
        status: "active",
    },
    {
        id: "p2",
        name: "Rohan Kapoor",
        age: 28,
        gender: "Male",
        phone: "+91 87654 32109",
        complaints: "Post-surgical rehab — knee replacement",
        sessions: 12,
        lastVisit: "2025-02-18",
        status: "active",
    },
    {
        id: "p3",
        name: "Sunita Rao",
        age: 52,
        gender: "Female",
        phone: "+91 76543 21098",
        complaints: "Shoulder impingement, frozen shoulder",
        sessions: 8,
        lastVisit: "2025-02-15",
        status: "active",
    },
    {
        id: "p4",
        name: "Vikram Singh",
        age: 45,
        gender: "Male",
        phone: "+91 65432 10987",
        complaints: "Sports injury — hamstring tear",
        sessions: 20,
        lastVisit: "2025-02-10",
        status: "discharged",
    },
    {
        id: "p5",
        name: "Meena Joshi",
        age: 61,
        gender: "Female",
        phone: "+91 54321 09876",
        complaints: "Osteoarthritis, knee pain",
        sessions: 3,
        lastVisit: "2025-02-14",
        status: "active",
    },
    {
        id: "p6",
        name: "Deepak Verma",
        age: 39,
        gender: "Male",
        phone: "+91 43210 98765",
        complaints: "Cervical spondylosis, neck stiffness",
        sessions: 6,
        lastVisit: "2025-02-12",
        status: "active",
    },
];

export default function PatientsPage() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<(typeof PATIENTS)[0] | null>(null);

    const filtered = PATIENTS.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.phone.includes(search) ||
            p.complaints.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full overflow-hidden">
            {/* Patient List */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
                    <h1 className="text-xl font-semibold">Patients</h1>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search patients..."
                                className="pl-8 text-sm w-56"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button size="sm" className="gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" />
                            New Patient
                        </Button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-white shrink-0">
                    {["All", "Active", "Discharged"].map((t) => (
                        <button
                            key={t}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                t === "All"
                                    ? "bg-foreground text-white"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                        {filtered.length} patients
                    </span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b border-border z-10">
                            <tr>
                                {["Patient", "Age / Gender", "Contact", "Complaints", "Sessions", "Last Visit", "Status", ""].map((h) => (
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
                            {filtered.map((p) => (
                                <tr
                                    key={p.id}
                                    onClick={() => setSelected(p)}
                                    className={cn(
                                        "border-b border-border cursor-pointer transition-colors hover:bg-muted/40",
                                        selected?.id === p.id ? "bg-muted/60" : ""
                                    )}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.age} · {p.gender}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{p.complaints}</td>
                                    <td className="px-4 py-3 text-center font-medium">{p.sessions}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{p.lastVisit}</td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] capitalize",
                                                p.status === "active"
                                                    ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                                    : "border-muted-foreground/30 text-muted-foreground"
                                            )}
                                        >
                                            {p.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Patient Detail Panel */}
            {selected && (
                <div className="w-[280px] shrink-0 border-l border-border bg-white flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h2 className="font-semibold text-sm">Patient Profile</h2>
                        <button
                            onClick={() => setSelected(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Avatar + name */}
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                                {selected.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold">{selected.name}</p>
                                <p className="text-xs text-muted-foreground">PHC-{selected.id.toUpperCase()}</p>
                            </div>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] capitalize",
                                    selected.status === "active"
                                        ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                        : "border-muted-foreground/30 text-muted-foreground"
                                )}
                            >
                                {selected.status}
                            </Badge>
                        </div>

                        {/* Details */}
                        <div className="space-y-2.5 text-sm">
                            {[
                                ["Age", selected.age],
                                ["Gender", selected.gender],
                                ["Phone", selected.phone],
                                ["Total Sessions", selected.sessions],
                                ["Last Visit", selected.lastVisit],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="flex justify-between">
                                    <span className="text-muted-foreground text-xs">{label}</span>
                                    <span className="text-xs font-medium">{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Complaints */}
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                Presenting Complaints
                            </p>
                            <p className="text-xs text-muted-foreground bg-muted rounded-md p-2.5 leading-relaxed">
                                {selected.complaints}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <Button size="sm" className="w-full text-xs">
                                Book Session
                            </Button>
                            <Button variant="outline" size="sm" className="w-full text-xs">
                                View Full History
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

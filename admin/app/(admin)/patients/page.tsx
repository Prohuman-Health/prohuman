"use client";

import { useState } from "react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PATIENTS = [
    { id: "p1", name: "Aisha Mehta", age: 34, gender: "Female", phone: "+91 98765 43210", complaints: "Lower back pain, difficulty walking", sessions: 5, lastVisit: "Feb 17, 2025", status: "active" },
    { id: "p2", name: "Rohan Kapoor", age: 28, gender: "Male", phone: "+91 87654 32109", complaints: "Post-surgical rehab — knee replacement", sessions: 12, lastVisit: "Feb 18, 2025", status: "active" },
    { id: "p3", name: "Sunita Rao", age: 52, gender: "Female", phone: "+91 76543 21098", complaints: "Shoulder impingement, frozen shoulder", sessions: 8, lastVisit: "Feb 15, 2025", status: "active" },
    { id: "p4", name: "Vikram Singh", age: 45, gender: "Male", phone: "+91 65432 10987", complaints: "Sports injury — hamstring tear", sessions: 20, lastVisit: "Feb 10, 2025", status: "discharged" },
    { id: "p5", name: "Meena Joshi", age: 61, gender: "Female", phone: "+91 54321 09876", complaints: "Osteoarthritis, knee pain", sessions: 3, lastVisit: "Feb 14, 2025", status: "active" },
    { id: "p6", name: "Deepak Verma", age: 39, gender: "Male", phone: "+91 43210 98765", complaints: "Cervical spondylosis, neck stiffness", sessions: 6, lastVisit: "Feb 12, 2025", status: "active" },
];

const AVATAR_COLORS = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700"];

export default function PatientsPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [selected, setSelected] = useState<typeof PATIENTS[0] | null>(null);

    const filtered = PATIENTS.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
        const matchFilter = filter === "All" || p.status === filter.toLowerCase();
        return matchSearch && matchFilter;
    });

    return (
        <div className="flex h-full overflow-hidden gap-4 p-5">
            <div className="flex flex-col flex-1 min-w-0 gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">View and manage all registered patients.</p>
                    </div>
                    <Button size="sm" className="gap-1.5 rounded-xl">
                        <Plus className="w-4 h-4" /> New Patient
                    </Button>
                </div>

                {/* Search + Filter */}
                <div className="flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search patients..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                        {["All", "Active", "Discharged"].map((f) => (
                            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", filter === f ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1">
                    <table className="w-full text-sm">
                        <thead className="border-b border-border/60">
                            <tr>
                                {["Patient", "Age / Gender", "Contact", "Complaints", "Sessions", "Last Visit", "Status", ""].map((h) => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, i) => (
                                <tr key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)} className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30", selected?.id === p.id && "bg-muted/50")}>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{p.age} · {p.gender}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{p.phone}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground max-w-[180px] truncate">{p.complaints}</td>
                                    <td className="px-5 py-3.5 text-center font-semibold">{p.sessions}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{p.lastVisit}</td>
                                    <td className="px-5 py-3.5">
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                            p.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground"
                                        )}>
                                            {p.status}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3.5"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Panel */}
            {selected && (
                <div className="w-[260px] shrink-0 bg-white rounded-2xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                        <h2 className="font-semibold text-sm">Patient Profile</h2>
                        <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
                    </div>
                    <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold", AVATAR_COLORS[PATIENTS.indexOf(selected) % AVATAR_COLORS.length])}>
                                {selected.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-base">{selected.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">PHC-{selected.id.toUpperCase()}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                selected.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground"
                            )}>
                                {selected.status}
                            </Badge>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-3.5 space-y-2.5">
                            {[["Age", String(selected.age)], ["Gender", selected.gender], ["Phone", selected.phone], ["Total Sessions", String(selected.sessions)], ["Last Visit", selected.lastVisit]].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                    <p className="text-xs font-medium mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Presenting Complaints</p>
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">{selected.complaints}</p>
                        </div>

                        <div className="space-y-2">
                            <Button size="sm" className="w-full rounded-xl text-xs">View Full History</Button>
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">Edit Patient</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

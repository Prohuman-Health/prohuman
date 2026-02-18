"use client";

import { useState } from "react";
import { Plus, Search, MoreHorizontal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOCTORS = [
    {
        id: "d1", name: "Dr. Priya Sharma", specialization: "Musculoskeletal Physiotherapy",
        phone: "+91 98765 43210", email: "priya.sharma@prohuman.in",
        schedule: "Mon–Fri, 9 AM–5 PM", status: "active", sessions: 24,
    },
    {
        id: "d2", name: "Dr. Arjun Nair", specialization: "Sports Rehabilitation",
        phone: "+91 87654 32109", email: "arjun.nair@prohuman.in",
        schedule: "Mon–Sat, 10 AM–6 PM", status: "active", sessions: 18,
    },
    {
        id: "d3", name: "Dr. Meera Iyer", specialization: "Neurological Physiotherapy",
        phone: "+91 76543 21098", email: "meera.iyer@prohuman.in",
        schedule: "Tue–Sat, 9 AM–3 PM", status: "unavailable", sessions: 8,
    },
    {
        id: "d4", name: "Dr. Kiran Das", specialization: "Paediatric Physiotherapy",
        phone: "+91 65432 10987", email: "kiran.das@prohuman.in",
        schedule: "Mon–Fri, 8 AM–4 PM", status: "active", sessions: 27,
    },
];

export default function DoctorsPage() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<typeof DOCTORS[0] | null>(null);

    const filtered = DOCTORS.filter(
        (d) =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.specialization.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white shrink-0">
                    <h1 className="text-xl font-semibold">Doctors</h1>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input placeholder="Search doctors..." className="pl-8 text-sm w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <Button size="sm" className="gap-1.5 text-xs">
                            <Plus className="w-3.5 h-3.5" /> Add Doctor
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b border-border z-10">
                            <tr>
                                {["Doctor", "Specialization", "Contact", "Schedule", "Sessions", "Status", ""].map((h) => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((d) => (
                                <tr
                                    key={d.id}
                                    onClick={() => setSelected(d)}
                                    className={cn("border-b border-border cursor-pointer transition-colors hover:bg-muted/40", selected?.id === d.id && "bg-muted/60")}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                                                {d.name.split(" ")[1]?.charAt(0)}
                                            </div>
                                            <span className="font-medium">{d.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{d.specialization}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.email}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{d.schedule}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium">{d.sessions}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className={cn("text-[10px] capitalize",
                                            d.status === "active" ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-red-200 text-red-500 bg-red-50"
                                        )}>
                                            {d.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Panel */}
            {selected && (
                <div className="w-[280px] shrink-0 border-l border-border bg-white flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h2 className="font-semibold text-sm">Doctor Profile</h2>
                        <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                    <div className="p-5 space-y-5">
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                                {selected.name.split(" ")[1]?.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold">{selected.name}</p>
                                <p className="text-xs text-muted-foreground">{selected.specialization}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] capitalize",
                                selected.status === "active" ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-red-200 text-red-500 bg-red-50"
                            )}>
                                {selected.status}
                            </Badge>
                        </div>

                        <div className="space-y-2.5 text-sm">
                            {[
                                ["Phone", selected.phone],
                                ["Email", selected.email],
                                ["Schedule", selected.schedule],
                                ["Sessions (Month)", selected.sessions],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground text-xs shrink-0">{label}</span>
                                    <span className="text-xs font-medium text-right">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Button size="sm" className="w-full text-xs">Edit Doctor</Button>
                            <Button variant="outline" size="sm" className="w-full text-xs">View Schedule</Button>
                            <Button variant="outline" size="sm" className="w-full text-xs text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
                                Mark Unavailable
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

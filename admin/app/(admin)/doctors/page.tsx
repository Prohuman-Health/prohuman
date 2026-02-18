"use client";

import { useState } from "react";
import { Plus, Search, Clock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOCTORS = [
    { id: "d1", name: "Dr. Priya Sharma", specialization: "Musculoskeletal Physiotherapy", phone: "+91 98765 43210", email: "priya.sharma@prohuman.in", schedule: "Mon–Fri, 9 AM–5 PM", status: "active", sessions: 24 },
    { id: "d2", name: "Dr. Arjun Nair", specialization: "Sports Rehabilitation", phone: "+91 87654 32109", email: "arjun.nair@prohuman.in", schedule: "Mon–Sat, 10 AM–6 PM", status: "active", sessions: 18 },
    { id: "d3", name: "Dr. Meera Iyer", specialization: "Neurological Physiotherapy", phone: "+91 76543 21098", email: "meera.iyer@prohuman.in", schedule: "Tue–Sat, 9 AM–3 PM", status: "unavailable", sessions: 8 },
    { id: "d4", name: "Dr. Kiran Das", specialization: "Paediatric Physiotherapy", phone: "+91 65432 10987", email: "kiran.das@prohuman.in", schedule: "Mon–Fri, 8 AM–4 PM", status: "active", sessions: 27 },
    { id: "d5", name: "Dr. Ananya Bose", specialization: "Geriatric Physiotherapy", phone: "+91 54321 09876", email: "ananya.bose@prohuman.in", schedule: "Mon–Thu, 9 AM–5 PM", status: "active", sessions: 15 },
];

const AVATAR_COLORS = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"];

export default function DoctorsPage() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<typeof DOCTORS[0] | null>(null);

    const filtered = DOCTORS.filter(
        (d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full overflow-hidden gap-4 p-5">
            {/* Main */}
            <div className="flex flex-col flex-1 min-w-0 gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Doctors</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage clinic doctors and their schedules.</p>
                    </div>
                    <Button size="sm" className="gap-1.5 rounded-xl">
                        <Plus className="w-4 h-4" /> Add Doctor
                    </Button>
                </div>

                {/* Search */}
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search doctors..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {/* Table card */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1">
                    <table className="w-full text-sm">
                        <thead className="border-b border-border">
                            <tr>
                                {["Doctor", "Specialization", "Email", "Schedule", "Sessions", "Status", ""].map((h) => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((d, i) => (
                                <tr
                                    key={d.id}
                                    onClick={() => setSelected(selected?.id === d.id ? null : d)}
                                    className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30", selected?.id === d.id && "bg-muted/50")}
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                {d.name.split(" ")[1]?.charAt(0)}
                                            </div>
                                            <span className="font-medium">{d.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground">{d.specialization}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{d.email}</td>
                                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{d.schedule}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-center font-semibold">{d.sessions}</td>
                                    <td className="px-5 py-3.5">
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                            d.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
                                        )}>
                                            {d.status}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
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
                        <h2 className="font-semibold text-sm">Doctor Profile</h2>
                        <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
                    </div>
                    <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold", AVATAR_COLORS[DOCTORS.indexOf(selected) % AVATAR_COLORS.length])}>
                                {selected.name.split(" ")[1]?.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-base">{selected.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{selected.specialization}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                selected.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
                            )}>
                                {selected.status}
                            </Badge>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-3.5 space-y-2.5">
                            {[["Phone", selected.phone], ["Email", selected.email], ["Schedule", selected.schedule], ["Sessions (Month)", String(selected.sessions)]].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                    <p className="text-xs font-medium mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Button size="sm" className="w-full rounded-xl text-xs">Edit Doctor</Button>
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">View Schedule</Button>
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs text-red-500 border-red-200 hover:bg-red-50">
                                Mark Unavailable
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

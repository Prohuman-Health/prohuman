"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronRight, RefreshCw, X, User, Phone, Mail, Calendar, Hash, Tag, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import type { Patient } from "@/lib/api";
import { patientLabelsApi, PatientLabel, patientsApi } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewPatientModal } from "@/components/modals/new-patient-modal";
import { PatientHistoryModal } from "@/components/modals/patient-history-modal";
import { EditPatientModal } from "@/components/modals/edit-patient-modal";

const AVATAR_COLORS = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700"];

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function PatientsPage() {
    const router = useRouter();
    const { patients, total, loading, filter, page, search, setFilter, setPage, setSearch, refresh } = usePatients();
    const [selected, setSelected] = useState<Patient | null>(null);
    const [newPatientOpen, setNewPatientOpen] = useState(false);
    const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
    const [editPatient, setEditPatient] = useState<Patient | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const LIMIT = 20;

    // Patient labels state
    const [labelDefs, setLabelDefs] = useState<PatientLabel[]>([]);
    const [labelsMap, setLabelsMap] = useState<Record<string, PatientLabel[]>>({});
    const [filterLabel, setFilterLabel] = useState<string>(""); // label id to filter by, "" = all
    const [selectedPatientLabels, setSelectedPatientLabels] = useState<PatientLabel[]>([]);
    const [assigningLabel, setAssigningLabel] = useState(false);

    const loadLabels = useCallback(async () => {
        try {
            const [defs, map] = await Promise.all([
                patientLabelsApi.listDefinitions(),
                patientLabelsApi.labelsMap(),
            ]);
            setLabelDefs(defs);
            setLabelsMap(map);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadLabels(); }, [loadLabels]);

    // When selected patient changes, reload their labels from the map
    useEffect(() => {
        if (selected) {
            setSelectedPatientLabels(labelsMap[selected.id] ?? []);
        }
    }, [selected, labelsMap]);

    async function assignLabel(labelId: string) {
        if (!selected) return;
        setAssigningLabel(true);
        try {
            await patientLabelsApi.assign(selected.id, labelId);
            const updated = await patientLabelsApi.labelsMap();
            setLabelsMap(updated);
            setSelectedPatientLabels(updated[selected.id] ?? []);
        } catch { /* ignore */ } finally { setAssigningLabel(false); }
    }

    async function removeLabel(labelId: string) {
        if (!selected) return;
        try {
            await patientLabelsApi.remove(selected.id, labelId);
            const updated = await patientLabelsApi.labelsMap();
            setLabelsMap(updated);
            setSelectedPatientLabels(updated[selected.id] ?? []);
        } catch { /* ignore */ }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await patientsApi.deactivate(deleteTarget.id);
            setDeleteTarget(null);
            setSelected(null);
            await refresh();
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Failed to delete patient");
        } finally {
            setDeleting(false);
        }
    }

    const filtered = patients.filter(p => {
        const matchesSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) ||
            p.phone.includes(search) || p.patient_code.toLowerCase().includes(search.toLowerCase());
        const matchesLabel = !filterLabel || (labelsMap[p.id] ?? []).some(l => l.id === filterLabel);
        return matchesSearch && matchesLabel;
    });

    return (
        <div className="flex h-full overflow-hidden gap-4 p-5">
            <div className="flex flex-col flex-1 min-w-0 gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{total} registered patients</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setNewPatientOpen(true)}><Plus className="w-4 h-4" /> New Patient</Button>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search name, phone, code…" className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                        {[["all", "All"], ["active", "Active"], ["discharged", "Discharged"]].map(([v, l]) => (
                            <button key={v} onClick={() => setFilter(v)}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", filter === v ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {l}
                            </button>
                        ))}
                    </div>
                    {labelDefs.length > 0 && (
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto max-w-xs">
                            <button onClick={() => setFilterLabel("")}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap",
                                    !filterLabel ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                <Tag className="w-3 h-3" /> All Labels
                            </button>
                            {labelDefs.map(l => (
                                <button key={l.id} onClick={() => setFilterLabel(filterLabel === l.id ? "" : l.id)}
                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap",
                                        filterLabel === l.id ? "text-white" : "text-muted-foreground hover:text-foreground")}
                                    style={filterLabel === l.id ? { backgroundColor: l.color } : undefined}>
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                                    {l.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1 border border-border/50">
                    <div className="overflow-x-auto h-full">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead className="border-b border-border/60 sticky top-0 bg-white z-10">
                                <tr>
                                    {["Patient", "Labels", "Code", "Age / Gender", "Phone", "Status", "Registered", ""].map(h => (
                                        <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border/60">
                                            {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                                        {search ? "No patients match your search" : "No patients registered yet"}
                                    </td></tr>
                                ) : filtered.map((p, i) => (
                                    <tr key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                                        className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30", selected?.id === p.id && "bg-muted/50")}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                    {p.full_name.charAt(0)}
                                                </div>
                                                <span className="font-medium">{p.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1 flex-wrap max-w-[160px]">
                                                {(labelsMap[p.id] ?? []).map(lbl => (
                                                    <span key={lbl.id} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                                        style={{ backgroundColor: lbl.color + "20", color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                                                        {lbl.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{p.patient_code}</td>
                                        <td className="px-5 py-3.5 text-muted-foreground">{p.age} · {p.gender}</td>
                                        <td className="px-5 py-3.5 text-muted-foreground">{p.phone}</td>
                                        <td className="px-5 py-3.5">
                                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                                p.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                                {p.is_active ? "Active" : "Discharged"}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                        <td className="px-5 py-3.5"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {total > LIMIT && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)}
                                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Prev</button>
                            <button disabled={page * LIMIT >= total} onClick={() => setPage(page + 1)}
                                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selected && (
                <div className="w-[260px] shrink-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                        <h2 className="font-semibold text-sm">Patient Profile</h2>
                        <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-16 h-16 rounded-2xl bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-2xl font-bold">
                                {selected.full_name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-base">{selected.full_name}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.patient_code}</p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                selected.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                {selected.is_active ? "Active" : "Discharged"}
                            </Badge>
                        </div>

                        <div className="space-y-2.5">
                            {[
                                { icon: User, label: `${selected.age} yrs · ${selected.gender}` },
                                { icon: Phone, label: selected.phone },
                                { icon: Mail, label: selected.email ?? "No email" },
                                { icon: Hash, label: selected.patient_code },
                                { icon: Calendar, label: new Date(selected.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{label}</span>
                                </div>
                            ))}
                        </div>

                        {selected.complaints && (
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Complaints</p>
                                <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">{selected.complaints}</p>
                            </div>
                        )}

                        {/* Labels */}
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Labels</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedPatientLabels.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No labels assigned</p>
                                )}
                                {selectedPatientLabels.map(lbl => (
                                    <span key={lbl.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: lbl.color + "20", color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                                        {lbl.name}
                                        <button onClick={() => removeLabel(lbl.id)}
                                            className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {labelDefs.filter(l => !selectedPatientLabels.some(sl => sl.id === l.id)).length > 0 && (
                                <Select onValueChange={v => { if (v) assignLabel(v); }} disabled={assigningLabel}>
                                    <SelectTrigger className="w-full h-8 rounded-xl text-xs text-muted-foreground">
                                        <SelectValue placeholder={assigningLabel ? "Assigning…" : "+ Add label…"} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {labelDefs.filter(l => !selectedPatientLabels.some(sl => sl.id === l.id)).map(l => (
                                            <SelectItem key={l.id} value={l.id} className="rounded-lg text-xs">{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Button size="sm" className="w-full rounded-xl text-xs gap-1.5" onClick={() => router.push(`/patients/${selected.id}`)}>View Details <ExternalLink className="w-3 h-3" /></Button>
                            <Button size="sm" className="w-full rounded-xl text-xs" variant="outline" onClick={() => setHistoryPatient(selected)}>View Full History</Button>
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs" onClick={() => setEditPatient(selected)}>Edit Patient</Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full rounded-xl text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1.5"
                                onClick={() => { setDeleteTarget(selected); setDeleteError(null); }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />Discharge Patient
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* New Patient Modal */}
            <NewPatientModal open={newPatientOpen} onClose={() => setNewPatientOpen(false)} />
            <PatientHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
            <EditPatientModal
                patient={editPatient}
                onClose={(updated) => {
                    setEditPatient(null);
                    if (updated) setSelected(updated); // refresh the side panel with new data
                }}
            />

            {/* Discharge / Delete confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Discharge Patient</p>
                                <p className="text-xs text-muted-foreground mt-0.5">This will mark the patient as discharged</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{deleteTarget.full_name}</span> ({deleteTarget.patient_code}) will be marked as discharged and removed from the active patient list.
                        </p>
                        {deleteError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{deleteError}</p>
                        )}
                        <div className="flex justify-end gap-3 pt-1">
                            <Button variant="outline" className="rounded-xl text-xs" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleting}>
                                Cancel
                            </Button>
                            <Button className="rounded-xl text-xs bg-red-600 hover:bg-red-700 gap-2" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Discharging…</> : "Discharge"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

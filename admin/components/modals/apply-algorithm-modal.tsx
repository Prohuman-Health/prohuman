"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Search, User, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { algorithmsApi, patientsApi } from "@/lib/api";
import type { Algorithm, Patient } from "@/lib/api";

interface Props { open: boolean; onClose: () => void; algorithm: Algorithm; }

export function ApplyAlgorithmModal({ open, onClose, algorithm }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Patient[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced patient search
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await patientsApi.list({ search: query.trim(), limit: "8" });
                setResults(data.patients);
            } catch { setResults([]); }
            finally { setSearching(false); }
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    function reset() {
        setQuery(""); setResults([]); setSelectedPatient(null);
        setNotes(""); setLoading(false); setSuccess(false); setApiError(null);
        onClose();
    }

    async function submit() {
        if (!selectedPatient) return;
        setLoading(true); setApiError(null);
        try {
            await algorithmsApi.applyToPatient(algorithm.id, {
                patient_id: selectedPatient.id,
                notes: notes.trim() || undefined,
            });
            setSuccess(true);
            setTimeout(() => { reset(); }, 1400);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to apply algorithm");
        } finally { setLoading(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Apply to Patient</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{algorithm.name}</p>
                        </div>
                    </div>
                    <button onClick={reset}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {apiError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 shrink-0" /> Algorithm applied to {selectedPatient?.full_name}!
                        </div>
                    )}

                    {/* Selected patient pill */}
                    {selectedPatient ? (
                        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-sm font-bold shrink-0">
                                {selectedPatient.full_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-violet-900">{selectedPatient.full_name}</p>
                                <p className="text-[11px] text-violet-600">{selectedPatient.patient_code} · {selectedPatient.phone}</p>
                            </div>
                            <button onClick={() => { setSelectedPatient(null); setQuery(""); }}
                                className="text-violet-400 hover:text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">Search Patient <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                                <Input
                                    className="pl-9 rounded-xl"
                                    placeholder="Type patient name, code or phone…"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {results.length > 0 && (
                                <div className="border border-border rounded-xl overflow-hidden shadow-lg">
                                    {results.map((p, i) => (
                                        <button key={p.id} type="button"
                                            onClick={() => { setSelectedPatient(p); setQuery(""); setResults([]); }}
                                            className={cn("w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left",
                                                i > 0 && "border-t border-border/40")}>
                                            <div className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                                                {p.full_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{p.full_name}</p>
                                                <p className="text-[11px] text-muted-foreground">{p.patient_code} · {p.gender}, {p.age}y</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {query.trim().length >= 2 && !searching && results.length === 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                    <User className="w-3.5 h-3.5" /> No patients found for &quot;{query}&quot;
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Notes <span className="text-[10px] font-normal text-muted-foreground">(optional)</span></label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            placeholder="Any additional context for applying this protocol…"
                            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                    </div>
                </div>

                <div className="px-6 pb-5 flex gap-3">
                    <Button variant="outline" onClick={reset} className="flex-1 rounded-xl" disabled={loading}>Cancel</Button>
                    <Button onClick={submit} disabled={!selectedPatient || loading || success}
                        className="flex-1 rounded-xl gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Applying…</> :
                            success ? <><CheckCircle2 className="w-4 h-4" />Applied!</> :
                                "Apply Algorithm"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

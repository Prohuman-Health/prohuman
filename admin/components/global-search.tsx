"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Stethoscope, CalendarClock, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import { useStaff } from "@/lib/contexts/staff-context";
import { useSessions } from "@/lib/contexts/sessions-context";

type ResultKind = "patient" | "doctor" | "session";

interface SearchResult {
    id: string;
    kind: ResultKind;
    primary: string;
    secondary: string;
    href: string;
}

const KIND_ICON: Record<ResultKind, React.ReactNode> = {
    patient: <User className="w-3.5 h-3.5" />,
    doctor: <Stethoscope className="w-3.5 h-3.5" />,
    session: <CalendarClock className="w-3.5 h-3.5" />,
};

const KIND_COLOR: Record<ResultKind, string> = {
    patient: "bg-violet-100 text-violet-600",
    doctor: "bg-emerald-100 text-emerald-600",
    session: "bg-blue-100 text-blue-600",
};

interface GlobalSearchProps {
    open: boolean;
    onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
    const router = useRouter();
    const { patients } = usePatients();
    const { doctors } = useStaff();
    const { sessions } = useSessions();

    const [query, setQuery] = useState("");
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Reset on open
    useEffect(() => {
        if (open) {
            setQuery("");
            setCursor(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const results: SearchResult[] = (() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const out: SearchResult[] = [];

        patients.forEach(p => {
            if (p.full_name.toLowerCase().includes(q) || p.patient_code.toLowerCase().includes(q) || p.phone.includes(q)) {
                out.push({ id: p.id, kind: "patient", primary: p.full_name, secondary: `${p.patient_code} · ${p.phone}`, href: `/patients` });
            }
        });

        doctors.forEach(d => {
            if (d.full_name.toLowerCase().includes(q) || (d.specialty ?? "").toLowerCase().includes(q)) {
                out.push({ id: d.id, kind: "doctor", primary: d.full_name, secondary: d.specialty ?? "Doctor", href: `/doctors` });
            }
        });

        sessions.forEach(s => {
            const dt = new Date(s.scheduled_at);
            const dateStr = dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            if (
                s.patient_name.toLowerCase().includes(q) ||
                s.doctor_name.toLowerCase().includes(q) ||
                s.session_type_name.toLowerCase().includes(q) ||
                s.patient_code.toLowerCase().includes(q)
            ) {
                out.push({
                    id: s.id, kind: "session",
                    primary: `${s.patient_name} with ${s.doctor_name}`,
                    secondary: `${s.session_type_name} · ${dateStr}`,
                    href: `/sessions`,
                });
            }
        });

        return out.slice(0, 12);
    })();

    // Reset cursor when results change
    useEffect(() => { setCursor(0); }, [results.length]);

    const navigate = useCallback((result: SearchResult) => {
        router.push(result.href);
        onClose();
    }, [router, onClose]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor(c => Math.min(c + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor(c => Math.max(c - 1, 0));
        } else if (e.key === "Enter" && results[cursor]) {
            navigate(results[cursor]);
        }
    };

    // Scroll active item into view
    useEffect(() => {
        const el = listRef.current?.children[cursor] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    }, [cursor]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="fixed left-1/2 top-[15%] z-50 -translate-x-1/2 w-full max-w-lg px-4">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-border/60">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search patients, doctors, sessions…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <kbd className="text-[10px] bg-muted border border-border rounded-md px-1.5 py-0.5 font-mono text-muted-foreground shrink-0">Esc</kbd>
                    </div>

                    {/* Results */}
                    {query.trim() && (
                        <ul ref={listRef} className="max-h-80 overflow-y-auto py-2">
                            {results.length === 0 ? (
                                <li className="px-4 py-8 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</li>
                            ) : results.map((r, i) => (
                                <li key={r.id + r.kind}>
                                    <button
                                        onClick={() => navigate(r)}
                                        onMouseEnter={() => setCursor(i)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                            i === cursor ? "bg-muted/60" : "hover:bg-muted/40"
                                        )}
                                    >
                                        <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", KIND_COLOR[r.kind])}>
                                            {KIND_ICON[r.kind]}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{r.primary}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{r.secondary}</p>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!query.trim() && (
                        <div className="px-4 py-5 text-center text-xs text-muted-foreground">
                            Start typing to search across patients, doctors & sessions
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

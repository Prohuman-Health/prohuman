"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { patientsApi, type Patient } from "@/lib/api";

interface GlobalSearchProps {
    onClose: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const id = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = query.trim();
        if (!q) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await patientsApi.list({ search: q, limit: "8" });
                setResults(res.patients);
                setCursor(0);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);
    }, [query]);

    function navigate(patient: Patient) {
        router.push(`/patients/${patient.id}`);
        onClose();
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
        if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
        if (e.key === "Enter" && results[cursor]) navigate(results[cursor]);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Search patients…"
                        className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground">Esc</kbd>
                </div>

                {/* Results */}
                <ul className="max-h-80 overflow-y-auto py-1.5">
                    {loading && (
                        <li className="px-4 py-3 text-sm text-muted-foreground">Searching…</li>
                    )}
                    {!loading && query && results.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm text-muted-foreground">No patients found</li>
                    )}
                    {!loading && !query && (
                        <li className="px-4 py-6 text-center text-sm text-muted-foreground">Type to search patients</li>
                    )}
                    {results.map((p, i) => (
                        <li key={p.id}>
                            <button
                                onClick={() => navigate(p)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left",
                                    i === cursor && "bg-muted/50"
                                )}
                            >
                                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground">{p.patient_code}{p.phone ? ` · ${p.phone}` : ""}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { settingsApi, Setting } from "@/lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
] as const;

function toIsoDate(y: number, m: number, d: number): string | null {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

function parseDateToken(raw: string): string | null {
    const token = raw.trim();
    if (!token) return null;

    const iso = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const y = Number(iso[1]);
        const m = Number(iso[2]);
        const d = Number(iso[3]);
        return toIsoDate(y, m, d);
    }

    const dmy = token.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dmy) {
        const d = Number(dmy[1]);
        const m = Number(dmy[2]);
        const y = Number(dmy[3]);
        return toIsoDate(y, m, d);
    }

    return null;
}

function uniqueSortedDates(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function expandDateRange(startIso: string, endIso: string): string[] {
    const [sy, sm, sd] = startIso.split("-").map(Number);
    const [ey, em, ed] = endIso.split("-").map(Number);

    const startTs = Date.UTC(sy, sm - 1, sd);
    const endTs = Date.UTC(ey, em - 1, ed);
    if (Number.isNaN(startTs) || Number.isNaN(endTs) || startTs > endTs) return [];

    const days = Math.floor((endTs - startTs) / DAY_MS) + 1;
    if (days > 370) return [];

    const out: string[] = [];
    for (let i = 0; i < days; i += 1) {
        const dt = new Date(startTs + i * DAY_MS);
        out.push(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`);
    }
    return out;
}

function parseBulkInput(raw: string): { dates: string[]; invalid: string[] } {
    const dates: string[] = [];
    const invalid: string[] = [];

    const tokens = raw
        .split(/\r?\n|,|;/)
        .map(t => t.trim())
        .filter(Boolean);

    tokens.forEach(token => {
        const rangeMatch = token.match(/^(.+?)\s(?:to|\.{2}|-|–|—)\s(.+)$/i);
        if (rangeMatch) {
            const start = parseDateToken(rangeMatch[1]);
            const end = parseDateToken(rangeMatch[2]);
            if (!start || !end) {
                invalid.push(token);
                return;
            }
            const expanded = expandDateRange(start, end);
            if (expanded.length === 0) {
                invalid.push(token);
                return;
            }
            dates.push(...expanded);
            return;
        }

        const single = parseDateToken(token);
        if (!single) {
            invalid.push(token);
            return;
        }
        dates.push(single);
    });

    return { dates: uniqueSortedDates(dates), invalid };
}

function coerceStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return uniqueSortedDates(value.filter((v): v is string => typeof v === "string").filter(v => !!parseDateToken(v)));
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return uniqueSortedDates(parsed.filter((v): v is string => typeof v === "string").filter(v => !!parseDateToken(v)));
            }
        } catch {
            const parsed = parseBulkInput(value);
            return parsed.dates;
        }
    }
    return [];
}

function coerceNumberArray(value: unknown): number[] {
    if (Array.isArray(value)) {
        return [...new Set(value.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v <= 6))].sort((a, b) => a - b);
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return [...new Set(parsed.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v <= 6))].sort((a, b) => a - b);
            }
        } catch {
            return [];
        }
    }
    return [];
}

function formatIsoDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function generateYearWeekdayDates(year: number, weekdays: number[]): string[] {
    const target = new Set(weekdays);
    const out: string[] = [];
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));

    for (let ts = start.getTime(); ts <= end.getTime(); ts += DAY_MS) {
        const dt = new Date(ts);
        if (target.has(dt.getUTCDay())) {
            out.push(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`);
        }
    }
    return out;
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function ClosedDaysSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [closedDates, setClosedDates] = useState<string[]>([]);
    const [weeklyClosed, setWeeklyClosed] = useState<number[]>([]);

    const [singleDate, setSingleDate] = useState("");
    const [rangeStart, setRangeStart] = useState("");
    const [rangeEnd, setRangeEnd] = useState("");
    const [bulkText, setBulkText] = useState("");
    const [invalidTokens, setInvalidTokens] = useState<string[]>([]);
    const [generatorYear, setGeneratorYear] = useState(String(new Date().getFullYear()));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list: Setting[] = await settingsApi.list();
            const map = new Map(list.map(s => [s.key, s.value]));
            setClosedDates(coerceStringArray(map.get("clinic_closed_days")));
            setWeeklyClosed(coerceNumberArray(map.get("clinic_weekly_closed_days")));
        } catch {
            setClosedDates([]);
            setWeeklyClosed([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalClosures = useMemo(() => closedDates.length, [closedDates]);

    function addDates(next: string[]) {
        setClosedDates(prev => uniqueSortedDates([...prev, ...next]));
    }

    function removeDate(target: string) {
        setClosedDates(prev => prev.filter(d => d !== target));
    }

    function toggleWeekly(day: number) {
        setWeeklyClosed(prev => {
            if (prev.includes(day)) return prev.filter(v => v !== day).sort((a, b) => a - b);
            return [...prev, day].sort((a, b) => a - b);
        });
    }

    function addSingleDate() {
        const parsed = parseDateToken(singleDate);
        if (!parsed) return;
        addDates([parsed]);
        setSingleDate("");
    }

    function addDateRange() {
        const start = parseDateToken(rangeStart);
        const end = parseDateToken(rangeEnd);
        if (!start || !end) return;
        const expanded = expandDateRange(start, end);
        if (expanded.length === 0) return;
        addDates(expanded);
        setRangeStart("");
        setRangeEnd("");
    }

    function addBulkDates() {
        const parsed = parseBulkInput(bulkText);
        addDates(parsed.dates);
        setInvalidTokens(parsed.invalid);
    }

    function addGeneratedWeekends(mode: "sun" | "sat_sun") {
        const yearNum = Number(generatorYear);
        if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) return;
        const weekdays = mode === "sun" ? [0] : [6, 0];
        addDates(generateYearWeekdayDates(yearNum, weekdays));
    }

    async function save() {
        setSaving(true);
        try {
            await settingsApi.bulkUpsert([
                { key: "clinic_closed_days", value: closedDates, branch_id: null },
                { key: "clinic_weekly_closed_days", value: weeklyClosed, branch_id: null },
            ]);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2200);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <CalendarDays className="w-4.5 h-4.5 text-violet-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Clinic Closed Days</h1>
                            <p className="text-sm text-muted-foreground">Set recurring weekly closures and one-off holiday dates.</p>
                        </div>
                    </div>
                </div>

                <Button className="rounded-xl gap-2" onClick={save} disabled={loading || saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-36" />
                    <Skeleton className="h-48" />
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5 space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold">Weekly Closed Days</h2>
                            <p className="text-xs text-muted-foreground mt-1">These apply every week (for example, every Sunday).</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWeekly(day.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                                        weeklyClosed.includes(day.value)
                                            ? "bg-foreground text-white border-foreground"
                                            : "bg-white text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5 space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold">One-off Closed Dates</h2>
                            <p className="text-xs text-muted-foreground mt-1">Add holidays, event days, or maintenance closures.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-border/70 p-3 space-y-2">
                                <p className="text-xs font-semibold">Add One Date</p>
                                <Input type="date" className="rounded-xl h-9" value={singleDate} onChange={e => setSingleDate(e.target.value)} />
                                <Button size="sm" className="rounded-xl w-full gap-1.5" onClick={addSingleDate}>
                                    <Plus className="w-3.5 h-3.5" /> Add Date
                                </Button>
                            </div>

                            <div className="rounded-xl border border-border/70 p-3 space-y-2">
                                <p className="text-xs font-semibold">Add Date Range</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="date" className="rounded-xl h-9" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
                                    <Input type="date" className="rounded-xl h-9" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
                                </div>
                                <Button size="sm" variant="outline" className="rounded-xl w-full" onClick={addDateRange}>Add Range</Button>
                            </div>

                            <div className="rounded-xl border border-border/70 p-3 space-y-2">
                                <p className="text-xs font-semibold">Quick Year Generator</p>
                                <Input
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    className="rounded-xl h-9"
                                    value={generatorYear}
                                    onChange={e => setGeneratorYear(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => addGeneratedWeekends("sun")}>Add Sundays</Button>
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => addGeneratedWeekends("sat_sun")}>Add Sat + Sun</Button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/70 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold">Bulk Paste</p>
                                <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1.5" onClick={addBulkDates}>
                                    <Wand2 className="w-3.5 h-3.5" /> Parse and Add
                                </Button>
                            </div>
                            <textarea
                                rows={5}
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                                placeholder={"Examples:\n2026-05-01\n02/05/2026\n2026-05-10 to 2026-05-15\n2026-08-15, 2026-10-02"}
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <p className="text-[11px] text-muted-foreground">Supported formats: YYYY-MM-DD, DD/MM/YYYY, comma or newline separated, and ranges using "to".</p>
                            {invalidTokens.length > 0 && (
                                <p className="text-[11px] text-red-600">Skipped invalid entries: {invalidTokens.slice(0, 8).join(", ")}{invalidTokens.length > 8 ? " ..." : ""}</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold">Saved Closed Dates</h2>
                                <p className="text-xs text-muted-foreground mt-1">{totalClosures} date{totalClosures !== 1 ? "s" : ""} configured.</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-xs"
                                onClick={() => setClosedDates([])}
                                disabled={closedDates.length === 0}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear All
                            </Button>
                        </div>

                        {closedDates.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                No closed dates added yet.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                                {closedDates.map(date => (
                                    <div key={date} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Badge variant="outline" className="rounded-full text-[10px]">{date}</Badge>
                                            <span className="text-xs text-muted-foreground truncate">{formatIsoDate(date)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDate(date)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors"
                                            title="Remove date"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {saved && (
                        <div className="fixed bottom-6 right-6 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium shadow-xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Clinic closure settings saved
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

"use client";

/**
 * lib/contexts/patients-context.tsx
 * 
 * Caches the patient list globally. Any component can call usePatients()
 * to get the current list without triggering a new fetch if data is fresh.
 * 
 * Cache strategy: data persists while the app is mounted. Pages call
 * refresh() explicitly when they need fresh data (e.g. after creating a patient).
 */

import {
    createContext, useContext, useState, useCallback,
    useRef, useEffect, ReactNode,
} from "react";
import { patientsApi, Patient, PatientListResponse } from "@/lib/api";

const STALE_MS = 60_000; // 1 minute

interface PatientsState {
    patients: Patient[];
    total: number;
    loading: boolean;
    error: string | null;
    // Current query params reflected in cache key
    page: number;
    filter: string;   // "all" | "active" | "discharged"
    search: string;
}

interface PatientsContextValue extends PatientsState {
    setPage: (p: number) => void;
    setFilter: (f: string) => void;
    setSearch: (s: string) => void;
    refresh: () => Promise<void>;
    createPatient: (data: Omit<Patient, "id" | "patient_code" | "created_at" | "is_active">) => Promise<Patient>;
}

const PatientsContext = createContext<PatientsContextValue | null>(null);

export function PatientsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PatientsState>({
        patients: [], total: 0, loading: false, error: null,
        page: 1, filter: "all", search: "",
    });
    const lastFetchAt = useRef<number>(0);
    const lastKey = useRef<string>("");

    const cacheKey = (s: PatientsState) => `${s.page}-${s.filter}`;

    const load = useCallback(async (s: PatientsState, force = false) => {
        const key = cacheKey(s);
        const now = Date.now();
        if (!force && key === lastKey.current && now - lastFetchAt.current < STALE_MS) return;

        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const params: Record<string, string> = {
                page: String(s.page), limit: "20",
            };
            if (s.filter !== "all") params.status = s.filter;

            const data: PatientListResponse = await patientsApi.list(params);
            lastFetchAt.current = Date.now();
            lastKey.current = key;
            setState(prev => ({ ...prev, patients: data.patients, total: data.total, loading: false }));
        } catch (e: unknown) {
            setState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : "Failed to load" }));
        }
    }, []);

    const setPage = useCallback((page: number) => {
        setState(prev => {
            const next = { ...prev, page };
            load(next);
            return next;
        });
    }, [load]);

    const setFilter = useCallback((filter: string) => {
        setState(prev => {
            const next = { ...prev, filter, page: 1 };
            load(next, true);
            return next;
        });
    }, [load]);

    const setSearch = useCallback((search: string) => {
        setState(prev => ({ ...prev, search }));
    }, []);

    const refresh = useCallback(() => {
        return new Promise<void>((resolve) => {
            setState(prev => {
                load(prev, true).then(resolve);
                return prev;
            });
        });
    }, [load]);

    const createPatient = useCallback(async (data: Omit<Patient, "id" | "patient_code" | "created_at" | "is_active">) => {
        const patient = await patientsApi.create(data);
        await refresh();
        return patient;
    }, [refresh]);

    // Initial fetch after component mounts — never during render
    useEffect(() => { load(state); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <PatientsContext.Provider value={{ ...state, setPage, setFilter, setSearch, refresh, createPatient }}>
            {children}
        </PatientsContext.Provider>
    );
}

export function usePatients() {
    const ctx = useContext(PatientsContext);
    if (!ctx) throw new Error("usePatients must be used within PatientsProvider");
    return ctx;
}

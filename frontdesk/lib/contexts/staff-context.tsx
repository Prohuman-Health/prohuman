"use client";

/**
 * lib/contexts/staff-context.tsx
 * Staff + Doctors lists — rarely change, cached for 5 minutes.
 * Also used as a lookup map for doctor dropdowns in session scheduling.
 */

import {
    createContext, useContext, useState, useCallback,
    useRef, useEffect, ReactNode, useMemo,
} from "react";
import { doctorsApi, Doctor } from "@/lib/api";
// StaffMember is not used in frontdesk — staff management is admin-only

const STALE_MS = 5 * 60_000;

interface StaffState {
    doctors: Doctor[];
    loading: boolean;
    error: string | null;
}

interface StaffContextValue extends StaffState {
    refresh: () => Promise<void>;
    /** Lookup map: doctor_id → Doctor */
    doctorMap: Record<string, Doctor>;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<StaffState>({
        doctors: [], loading: false, error: null,
    });
    const lastFetchAt = useRef<number>(0);

    const load = useCallback(async (force = false) => {
        if (!force && Date.now() - lastFetchAt.current < STALE_MS) return;

        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const doctors = await doctorsApi.list();
            lastFetchAt.current = Date.now();
            setState(prev => ({ ...prev, doctors, loading: false }));
        } catch (e: unknown) {
            setState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : "Failed to load doctors" }));
        }
    }, []);

    const refresh = useCallback(() => load(true), [load]);

    const doctorMap = useMemo(() =>
        Object.fromEntries(state.doctors.map(d => [d.id, d])),
        [state.doctors]
    );

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StaffContext.Provider value={{ ...state, refresh, doctorMap }}>
            {children}
        </StaffContext.Provider>
    );
}

export function useStaff() {
    const ctx = useContext(StaffContext);
    if (!ctx) throw new Error("useStaff must be used within StaffProvider");
    return ctx;
}

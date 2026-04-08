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
import { staffApi, doctorsApi, StaffMember, Doctor } from "@/lib/api";

const STALE_MS = 5 * 60_000;

interface StaffState {
    staff: StaffMember[];
    doctors: Doctor[];
    loading: boolean;
    error: string | null;
    showInactive: boolean;
}

interface StaffContextValue extends StaffState {
    setShowInactive: (v: boolean) => void;
    refresh: () => Promise<void>;
    /** Lookup map: doctor_id → Doctor */
    doctorMap: Record<string, Doctor>;
    createStaff: (data: Omit<StaffMember, "id" | "created_at"> & { password: string }) => Promise<StaffMember>;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<StaffState>({
        staff: [], doctors: [], loading: false, error: null, showInactive: false,
    });
    const lastFetchAt = useRef<number>(0);

    const load = useCallback(async (showInactive: boolean, force = false) => {
        if (!force && Date.now() - lastFetchAt.current < STALE_MS) return;

        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const [staffData, doctorsData] = await Promise.all([
                staffApi.list({ is_active: showInactive ? "false" : "true" }),
                doctorsApi.list(),
            ]);
            lastFetchAt.current = Date.now();
            setState(prev => ({ ...prev, staff: staffData, doctors: doctorsData, loading: false }));
        } catch (e: unknown) {
            setState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : "Failed to load" }));
        }
    }, []);

    const setShowInactive = useCallback((v: boolean) => {
        setState(prev => ({ ...prev, showInactive: v }));
        load(v, true);
    }, [load]);

    const refresh = useCallback(() => new Promise<void>((resolve) => {
        setState(prev => { load(prev.showInactive, true).then(resolve); return prev; });
    }), [load]);

    const createStaff = useCallback(async (data: Omit<StaffMember, "id" | "created_at"> & { password: string }) => {
        const member = await staffApi.create(data as Parameters<typeof staffApi.create>[0]);
        await refresh();
        return member;
    }, [refresh]);

    const doctorMap = useMemo(() =>
        Object.fromEntries(state.doctors.map(d => [d.id, d])),
        [state.doctors]
    );

    useEffect(() => { load(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StaffContext.Provider value={{ ...state, setShowInactive, refresh, doctorMap, createStaff }}>
            {children}
        </StaffContext.Provider>
    );
}

export function useStaff() {
    const ctx = useContext(StaffContext);
    if (!ctx) throw new Error("useStaff must be used within StaffProvider");
    return ctx;
}

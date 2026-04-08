"use client";

/**
 * lib/contexts/sessions-context.tsx
 * Cached sessions list — shared between the dashboard and sessions page.
 */

import {
    createContext, useContext, useState, useCallback,
    useRef, useEffect, ReactNode,
} from "react";
import { sessionsApi, Session, SessionListResponse } from "@/lib/api";

const STALE_MS = 30_000; // 30 sec — sessions change often

interface SessionsState {
    sessions: Session[];
    total: number;
    loading: boolean;
    error: string | null;
    page: number;
    filter: string; // status or "all"
}

interface SessionsContextValue extends SessionsState {
    setPage: (p: number) => void;
    setFilter: (f: string) => void;
    refresh: () => Promise<void>;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SessionsState>({
        sessions: [], total: 0, loading: false, error: null, page: 1, filter: "all",
    });
    const lastFetchAt = useRef<number>(0);
    const lastKey = useRef<string>("");

    const load = useCallback(async (s: SessionsState, force = false) => {
        const key = `${s.page}-${s.filter}`;
        if (!force && key === lastKey.current && Date.now() - lastFetchAt.current < STALE_MS) return;

        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const params: Record<string, string> = { page: String(s.page), limit: "25" };
            if (s.filter !== "all") params.status = s.filter;

            const data: SessionListResponse = await sessionsApi.list(params);
            lastFetchAt.current = Date.now();
            lastKey.current = key;
            setState(prev => ({ ...prev, sessions: data.sessions, total: data.total, loading: false }));
        } catch (e: unknown) {
            setState(prev => ({ ...prev, loading: false, error: e instanceof Error ? e.message : "Failed to load" }));
        }
    }, []);

    const setPage = useCallback((page: number) => {
        setState(prev => { const next = { ...prev, page }; load(next); return next; });
    }, [load]);

    const setFilter = useCallback((filter: string) => {
        setState(prev => { const next = { ...prev, filter, page: 1 }; load(next, true); return next; });
    }, [load]);

    const refresh = useCallback(() => new Promise<void>((resolve) => {
        setState(prev => { load(prev, true).then(resolve); return prev; });
    }), [load]);

    useEffect(() => { load(state); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <SessionsContext.Provider value={{ ...state, setPage, setFilter, refresh }}>
            {children}
        </SessionsContext.Provider>
    );
}

export function useSessions() {
    const ctx = useContext(SessionsContext);
    if (!ctx) throw new Error("useSessions must be used within SessionsProvider");
    return ctx;
}

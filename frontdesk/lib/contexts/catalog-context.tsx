"use client";

/**
 * lib/contexts/catalog-context.tsx
 * Exercises, Algorithms, and SessionTypes — reference data that changes rarely.
 * Single context to avoid too many providers, cached for 5 minutes.
 */

import {
    createContext, useContext, useState, useCallback,
    useRef, useEffect, ReactNode,
} from "react";
import { exercisesApi, algorithmsApi, sessionTypesApi } from "@/lib/api";
import type { Exercise, Algorithm, SessionType } from "@/lib/api";

const STALE_MS = 5 * 60_000;

interface CatalogState {
    exercises: Exercise[];
    exercisesTotal: number;
    exercisesPage: number;
    exerciseSearch: string;
    exerciseCategory: string;

    algorithms: Algorithm[];
    algorithmsTotal: number;
    algorithmsPage: number;
    algorithmSearch: string;

    sessionTypes: SessionType[];

    categories: string[];

    loading: { exercises: boolean; algorithms: boolean; sessionTypes: boolean };
    error: string | null;
}

interface CatalogContextValue extends CatalogState {
    // Exercises
    setExercisePage: (p: number) => void;
    setExerciseSearch: (s: string) => void;
    setExerciseCategory: (c: string) => void;
    refreshExercises: () => Promise<void>;

    // Algorithms
    setAlgorithmPage: (p: number) => void;
    setAlgorithmSearch: (s: string) => void;
    refreshAlgorithms: () => Promise<void>;

    // Session types
    refreshSessionTypes: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CatalogState>({
        exercises: [], exercisesTotal: 0, exercisesPage: 1,
        exerciseSearch: "", exerciseCategory: "",
        algorithms: [], algorithmsTotal: 0, algorithmsPage: 1, algorithmSearch: "",
        sessionTypes: [], categories: [],
        loading: { exercises: false, algorithms: false, sessionTypes: false },
        error: null,
    });

    const lastFetch = useRef({ exercises: 0, algorithms: 0, sessionTypes: 0 });
    const categoriesLoaded = useRef(false);

    // ── Exercises ────────────────────────────────────────────────────────────────
    const loadExercises = useCallback(async (s: CatalogState, force = false) => {
        if (!force && Date.now() - lastFetch.current.exercises < STALE_MS) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, exercises: true } }));
        try {
            const params: Record<string, string> = { page: String(s.exercisesPage), limit: "30" };
            if (s.exerciseSearch) params.search = s.exerciseSearch;
            if (s.exerciseCategory) params.category = s.exerciseCategory;

            const [data, cats] = await Promise.all([
                exercisesApi.list(params),
                categoriesLoaded.current ? Promise.resolve(null) : exercisesApi.categories(),
            ] as const);
            lastFetch.current.exercises = Date.now();
            if (cats) categoriesLoaded.current = true;
            setState(prev => ({
                ...prev,
                exercises: data.exercises,
                exercisesTotal: data.total,
                ...(cats ? { categories: cats } : {}),
                loading: { ...prev.loading, exercises: false },
            }));
        } catch {
            setState(prev => ({ ...prev, loading: { ...prev.loading, exercises: false } }));
        }
    }, []);

    // ── Algorithms ───────────────────────────────────────────────────────────────
    const loadAlgorithms = useCallback(async (s: CatalogState, force = false) => {
        if (!force && Date.now() - lastFetch.current.algorithms < STALE_MS) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, algorithms: true } }));
        try {
            const params: Record<string, string> = { page: String(s.algorithmsPage), limit: "30" };
            if (s.algorithmSearch) params.search = s.algorithmSearch;

            const data = await algorithmsApi.list(params);
            lastFetch.current.algorithms = Date.now();
            setState(prev => ({
                ...prev,
                algorithms: data.algorithms,
                algorithmsTotal: data.total,
                loading: { ...prev.loading, algorithms: false },
            }));
        } catch {
            setState(prev => ({ ...prev, loading: { ...prev.loading, algorithms: false } }));
        }
    }, []);

    // ── Session Types ─────────────────────────────────────────────────────────────
    const loadSessionTypes = useCallback(async (force = false) => {
        if (!force && Date.now() - lastFetch.current.sessionTypes < STALE_MS) return;
        setState(prev => ({ ...prev, loading: { ...prev.loading, sessionTypes: true } }));
        try {
            const data = await sessionTypesApi.list();
            lastFetch.current.sessionTypes = Date.now();
            setState(prev => ({
                ...prev, sessionTypes: data, loading: { ...prev.loading, sessionTypes: false },
            }));
        } catch {
            setState(prev => ({ ...prev, loading: { ...prev.loading, sessionTypes: false } }));
        }
    }, []);

    // ── Derived setters ───────────────────────────────────────────────────────────
    const setExercisePage = useCallback((p: number) => {
        setState(prev => { const next = { ...prev, exercisesPage: p }; loadExercises(next, true); return next; });
    }, [loadExercises]);

    const setExerciseSearch = useCallback((s: string) => {
        setState(prev => { const next = { ...prev, exerciseSearch: s, exercisesPage: 1 }; loadExercises(next, true); return next; });
    }, [loadExercises]);

    const setExerciseCategory = useCallback((c: string) => {
        setState(prev => { const next = { ...prev, exerciseCategory: c, exercisesPage: 1 }; loadExercises(next, true); return next; });
    }, [loadExercises]);

    const refreshExercises = useCallback(() =>
        new Promise<void>((r) => setState(prev => { loadExercises(prev, true).then(r); return prev; })),
        [loadExercises]);

    const setAlgorithmPage = useCallback((p: number) => {
        setState(prev => { const next = { ...prev, algorithmsPage: p }; loadAlgorithms(next, true); return next; });
    }, [loadAlgorithms]);

    const setAlgorithmSearch = useCallback((s: string) => {
        setState(prev => { const next = { ...prev, algorithmSearch: s, algorithmsPage: 1 }; loadAlgorithms(next, true); return next; });
    }, [loadAlgorithms]);

    const refreshAlgorithms = useCallback(() =>
        new Promise<void>((r) => setState(prev => { loadAlgorithms(prev, true).then(r); return prev; })),
        [loadAlgorithms]);

    const refreshSessionTypes = useCallback(() => loadSessionTypes(true), [loadSessionTypes]);

    // Initial fetch after mount — never during render
    useEffect(() => {
        loadExercises(state);
        loadAlgorithms(state);
        loadSessionTypes();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <CatalogContext.Provider value={{
            ...state,
            setExercisePage, setExerciseSearch, setExerciseCategory, refreshExercises,
            setAlgorithmPage, setAlgorithmSearch, refreshAlgorithms,
            refreshSessionTypes,
        }}>
            {children}
        </CatalogContext.Provider>
    );
}

export function useCatalog() {
    const ctx = useContext(CatalogContext);
    if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
    return ctx;
}

// Convenience split hooks
export const useExercises = () => {
    const { exercises, exercisesTotal, exercisesPage, exerciseSearch, exerciseCategory,
        categories, loading, setExercisePage, setExerciseSearch, setExerciseCategory, refreshExercises } = useCatalog();
    return {
        exercises, total: exercisesTotal, page: exercisesPage, search: exerciseSearch,
        category: exerciseCategory, categories, loading: loading.exercises,
        setPage: setExercisePage, setSearch: setExerciseSearch, setCategory: setExerciseCategory, refresh: refreshExercises
    };
};

export const useAlgorithms = () => {
    const { algorithms, algorithmsTotal, algorithmsPage, algorithmSearch,
        loading, setAlgorithmPage, setAlgorithmSearch, refreshAlgorithms } = useCatalog();
    return {
        algorithms, total: algorithmsTotal, page: algorithmsPage, search: algorithmSearch,
        loading: loading.algorithms, setPage: setAlgorithmPage, setSearch: setAlgorithmSearch, refresh: refreshAlgorithms
    };
};

export const useSessionTypes = () => {
    const { sessionTypes, loading, refreshSessionTypes } = useCatalog();
    return { sessionTypes, loading: loading.sessionTypes, refresh: refreshSessionTypes };
};

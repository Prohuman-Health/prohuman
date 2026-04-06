"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { authApi, StaffUser, setToken, clearToken, getToken } from "./api";

interface AuthState {
    user: StaffUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

/**
 * Hook that logs the user out after `timeoutMs` milliseconds of inactivity.
 * Pass 0 or undefined to disable.
 */
export function useInactivityLogout(timeoutMs: number | undefined, logout: () => void) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!timeoutMs || timeoutMs <= 0) return;

        function reset() {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(logout, timeoutMs);
        }

        const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset(); // start the timer immediately

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(e => window.removeEventListener(e, reset));
        };
    }, [timeoutMs, logout]);
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<StaffUser | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount, check if there's a stored token and validate it
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        authApi
            .me()
            .then(setUser)
            .catch(() => clearToken())
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await authApi.login(email, password);
        setToken(res.token);
        setUser(res.user);
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}

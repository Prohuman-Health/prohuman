"use client";

import {
    createContext,
    useContext,
    useEffect,
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

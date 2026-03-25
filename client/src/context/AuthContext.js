import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "../lib/api";
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setTokenState] = useState(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const login = useCallback(async (email, password) => {
        const response = await api.post("/auth/login", { email, password });
        const nextToken = response.data.data.accessToken;
        const nextUser = response.data.data.user;
        setTokenState(nextToken);
        setAccessToken(nextToken);
        setUser(nextUser);
    }, []);
    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        }
        catch {
            // no-op on forced logout
        }
        setTokenState(null);
        setAccessToken(null);
        setUser(null);
    }, []);
    useEffect(() => {
        const bootstrap = async () => {
            try {
                const response = await api.post("/auth/refresh");
                const nextToken = response.data.data.accessToken;
                const nextUser = response.data.data.user;
                setTokenState(nextToken);
                setAccessToken(nextToken);
                setUser(nextUser);
            }
            catch {
                setTokenState(null);
                setAccessToken(null);
                setUser(null);
            }
            finally {
                setIsBootstrapping(false);
            }
        };
        bootstrap().catch(() => setIsBootstrapping(false));
    }, []);
    useEffect(() => {
        const onForcedLogout = () => {
            setTokenState(null);
            setUser(null);
        };
        const onTokenRefresh = (event) => {
            const custom = event;
            if (custom.detail?.token) {
                setTokenState(custom.detail.token);
            }
        };
        window.addEventListener("auth:logout", onForcedLogout);
        window.addEventListener("auth:token", onTokenRefresh);
        return () => {
            window.removeEventListener("auth:logout", onForcedLogout);
            window.removeEventListener("auth:token", onTokenRefresh);
        };
    }, []);
    const hasRole = useCallback((...roles) => {
        if (!user) {
            return false;
        }
        return roles.includes(user.role);
    }, [user]);
    const value = useMemo(() => ({
        user,
        accessToken: token,
        isBootstrapping,
        login,
        logout,
        hasRole
    }), [user, token, isBootstrapping, login, logout, hasRole]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
};

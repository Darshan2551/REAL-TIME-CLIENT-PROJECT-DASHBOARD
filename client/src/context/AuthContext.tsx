import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { api, setAccessToken } from "../lib/api";
import type { Role, User } from "../types/models";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const nextToken = response.data.data.accessToken as string;
    const nextUser = response.data.data.user as User;

    setTokenState(nextToken);
    setAccessToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
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
        const nextToken = response.data.data.accessToken as string;
        const nextUser = response.data.data.user as User;

        setTokenState(nextToken);
        setAccessToken(nextToken);
        setUser(nextUser);
      } catch {
        setTokenState(null);
        setAccessToken(null);
        setUser(null);
      } finally {
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

    const onTokenRefresh = (event: Event) => {
      const custom = event as CustomEvent<{ token: string }>;
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

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) {
        return false;
      }

      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: token,
      isBootstrapping,
      login,
      logout,
      hasRole
    }),
    [user, token, isBootstrapping, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

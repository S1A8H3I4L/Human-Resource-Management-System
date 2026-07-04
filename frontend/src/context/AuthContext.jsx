import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, saveToken, clearToken, getToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const me = await api.me();
          setUser(me);
        } catch {
          clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (loginId, password) => {
    const data = await api.login({ loginId, password });
    saveToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    saveToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.me();
    setUser(me);
    return me;
  }, []);

  const isAdmin = user ? ["admin", "hr"].includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

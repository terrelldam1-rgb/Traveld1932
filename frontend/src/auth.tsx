import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role?: "user" | "admin";
  phone?: string | null;
  emergency_contact?: string | null;
};

type Ctx = {
  user: User | null | undefined; // undefined = loading
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    await setToken(data.token);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    await setToken(data.token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

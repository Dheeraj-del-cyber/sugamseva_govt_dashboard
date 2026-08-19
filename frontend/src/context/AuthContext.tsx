import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

export interface Official {
  id: string;
  govt_id: string;
  full_name: string;
  dob?: string;
  phone_number: string;
  email?: string;
  address?: string;
  photo_url?: string;
  is_verified: boolean;
}

interface AuthContextValue {
  official: Official | null;
  loading: boolean;
  login: (govt_id: string, password: string) => Promise<void>;
  signup: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  setOfficial: (o: Official) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [official, setOfficialState] = useState<Official | null>(() => {
    const raw = localStorage.getItem("sugamseva_official");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading] = useState(false);

  const setOfficial = (o: Official) => {
    setOfficialState(o);
    localStorage.setItem("sugamseva_official", JSON.stringify(o));
  };

  const login = async (govt_id: string, password: string) => {
    const { data } = await api.post("/auth/login", { govt_id, password });
    localStorage.setItem("sugamseva_token", data.access_token);
    setOfficial(data.official);
  };

  const signup = async (payload: Record<string, unknown>) => {
    const { data } = await api.post("/auth/signup", payload);
    localStorage.setItem("sugamseva_token", data.access_token);
    setOfficial(data.official);
  };

  const logout = () => {
    localStorage.removeItem("sugamseva_token");
    localStorage.removeItem("sugamseva_official");
    setOfficialState(null);
  };

  useEffect(() => {
    // Keep localStorage as the single source of truth across tabs.
    const onStorage = () => {
      const raw = localStorage.getItem("sugamseva_official");
      setOfficialState(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ official, loading, login, signup, logout, setOfficial }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

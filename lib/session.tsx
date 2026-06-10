"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SessionUser = { name: string };

type SessionContextValue = {
  user: SessionUser | null;
  login: (user: SessionUser | null) => void; // null = modo invitado
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const login = (u: SessionUser | null) => setUser(u);
  const logout = () => setUser(null);

  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}

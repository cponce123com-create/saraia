// ═══════════════════════════════════════════════════════════════════
//  AuthContext — DEPRECATED
//  Reemplazado por src/hooks/useAuth.ts (Supabase Auth)
//  Mantenido solo para no romper imports de archivos legacy.
// ═══════════════════════════════════════════════════════════════════

import { createContext, useContext, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: { userId: string; email: string; nombre: string; rol: string } | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  user: null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hook useAuth de Supabase reemplaza este Context
  return <>{children}</>;
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

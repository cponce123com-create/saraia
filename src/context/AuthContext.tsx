import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface AuthUser {
  userId: string;
  email: string;
  nombre: string;
  rol: 'gerente' | 'contador' | 'supervisor' | 'almacenero';
  empresaId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; nombre: string; empresa_id?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Almacenar token en memoria + localStorage para persistencia
function getStoredToken(): string | null {
  return localStorage.getItem('saraia-token');
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('saraia-token', token);
  } else {
    localStorage.removeItem('saraia-token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const hasRole = useCallback((...roles: string[]) => {
    return user ? roles.includes(user.rol) : false;
  }, [user]);

  // Verificar token al cargar
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token inválido');
        return res.json();
      })
      .then((data: AuthUser) => {
        setUser(data);
        setToken(stored);
      })
      .catch(() => {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (data: { email: string; password: string; nombre: string; empresa_id?: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const response = await res.json();
    if (!res.ok) throw new Error(response.error || 'Error al registrarse');

    setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
);
  return ctx;
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Perfil } from '../types';

interface UseAuthReturn {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  puedeEditar: () => boolean;
  puedeVerSueldos: () => boolean;
  esGerente: () => boolean;
  esSupervisor: () => boolean;
}

function cargarPerfilDesdeStorage(): Perfil | null {
  try {
    const raw = sessionStorage.getItem('saraia-perfil');
    return raw ? (JSON.parse(raw) as Perfil) : null;
  } catch {
    return null;
  }
}

function guardarPerfilEnStorage(p: Perfil | null) {
  if (p) {
    sessionStorage.setItem('saraia-perfil', JSON.stringify(p));
  } else {
    sessionStorage.removeItem('saraia-perfil');
  }
}

async function obtenerPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, empresa_id, rol, nombre')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al cargar perfil:', error.message);
    return null;
  }
  return data;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(cargarPerfilDesdeStorage);
  const [loading, setLoading] = useState(true);

  // Cargar sesión al montar
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;

      if (session?.user) {
        setUser(session.user);
        const p = await obtenerPerfil(session.user.id);
        if (!cancelled) {
          setPerfil(p);
          guardarPerfilEnStorage(p);
        }
      }
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          const p = await obtenerPerfil(session.user.id);
          setPerfil(p);
          guardarPerfilEnStorage(p);
        } else {
          setPerfil(null);
          guardarPerfilEnStorage(null);
        }

        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: traducirErrorAuth(error.message) };
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    guardarPerfilEnStorage(null);
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  }, []);

  const puedeEditar = useCallback((): boolean => {
    return perfil?.rol === 'gerente' || perfil?.rol === 'contador';
  }, [perfil]);

  const puedeVerSueldos = useCallback((): boolean => {
    return perfil?.rol === 'gerente' || perfil?.rol === 'contador';
  }, [perfil]);

  const esGerente = useCallback((): boolean => {
    return perfil?.rol === 'gerente';
  }, [perfil]);

  const esSupervisor = useCallback((): boolean => {
    return perfil?.rol === 'supervisor';
  }, [perfil]);

  return {
    user,
    perfil,
    loading,
    signIn,
    signOut,
    puedeEditar,
    puedeVerSueldos,
    esGerente,
    esSupervisor,
  };
}

function traducirErrorAuth(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (msg.includes('Email not confirmed')) return 'Correo electrónico no confirmado. Revisa tu bandeja de entrada';
  if (msg.includes('User already registered')) return 'Este correo ya está registrado';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  if (msg.includes('rate_limit')) return 'Demasiados intentos. Espera unos segundos y vuelve a intentar';
  if (msg.includes('network')) return 'Error de conexión. Verifica tu internet';
  return msg || 'Error desconocido al iniciar sesión';
}

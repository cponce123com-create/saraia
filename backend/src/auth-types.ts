export interface UsuarioRow {
  id: string;
  empresa_id: string | null;
  email: string;
  password_hash: string;
  nombre: string;
  rol: 'gerente' | 'contador' | 'supervisor' | 'almacenero';
  activo: boolean;
  created_at: string;
}

export type UserRol = 'gerente' | 'contador' | 'supervisor' | 'almacenero';

export interface JwtPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: UserRol;
  empresaId: string | null;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  nombre: string;
  rol?: UserRol;
  empresa_id?: string;
}

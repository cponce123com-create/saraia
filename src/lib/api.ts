// Add auth token to API requests
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let url = `${API_BASE}${path}`;
  if (opts.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined && value !== '') searchParams.set(key, value);
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    // Token expirado — limpiar sesión
    setAuthToken(null);
    localStorage.removeItem('saraia-token');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Error HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Tipos de respuesta API ───────────────────────────────────────

export interface GastoResponse {
  id: string;
  empresa_id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: 'gasto' | 'ingreso';
  mensaje: string | null;
  saldo: number | null;
  estado: 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
  factura_id: string | null;
  created_at: string;
  match_status?: string | null;
  factura_monto?: number | null;
  factura?: FacturaResponse | null;
}

export interface GastosListResponse {
  gastos: GastoResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface FacturaResponse {
  id: string;
  gasto_id: string;
  image_base64: string | null;
  image_mime: string;
  ocr_fecha: string | null;
  ocr_monto: number | null;
  ocr_proveedor: string | null;
  ocr_ruc: string | null;
  ocr_tipo: string | null;
  ocr_numero: string | null;
  match_status: 'auto' | 'conflicto' | 'sin_match' | 'manual';
  match_score: number | null;
  created_at: string;
}

export interface EmpresaResponse {
  id: string;
  nombre: string;
  ruc: string;
  color: string;
  created_at: string;
}

export interface PersonalResponse {
  id: string;
  empresa_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  cargo: string | null;
  tipo_contrato: string;
  estado: string;
  banco1: string | null;
  cuenta1: string | null;
  tipo_cuenta1: string | null;
  banco2: string | null;
  cuenta2: string | null;
  tipo_cuenta2: string | null;
  sueldo_base: number | null;
  created_at: string;
}

export interface AsistenciaResponse {
  id: string;
  personal_id: string;
  empresa_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_normales: number;
  horas_extras: number;
  tipo_hora_extra: string | null;
  observacion: string | null;
  nombres?: string;
  apellidos?: string;
  dni?: string;
}

// ─── API Methods ─────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: Record<string, unknown> }>('/api/auth/login', { method: 'POST', body: { email, password } }),
    register: (data: { email: string; password: string; nombre: string; empresa_id?: string }) =>
      request<{ token: string; user: Record<string, unknown> }>('/api/auth/register', { method: 'POST', body: data }),
    me: () => request<Record<string, unknown>>('/api/auth/me'),
  },

  // Gastos
  gastos: {
    list: (params?: { empresa_id?: string; estado?: string; desde?: string; hasta?: string; search?: string; limit?: string; offset?: string }) =>
      request<GastosListResponse>('/api/gastos', { params }),
    get: (id: string) => request<GastoResponse>(`/api/gastos/${id}`),
    create: (data: { empresa_id: string; fecha: string; descripcion: string; monto: number; tipo: string; mensaje?: string; saldo?: number }) =>
      request<GastoResponse>('/api/gastos', { method: 'POST', body: data }),
    update: (id: string, data: { estado?: string; mensaje?: string; descripcion?: string; monto?: number }) =>
      request<GastoResponse>(`/api/gastos/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ deleted: boolean }>(`/api/gastos/${id}`, { method: 'DELETE' }),
  },

  // Facturas
  facturas: {
    getByGasto: (gastoId: string) => request<FacturaResponse | null>(`/api/facturas?gasto_id=${gastoId}`),
    list: () => request<FacturaResponse[]>('/api/facturas'),
    create: (data: { gasto_id: string; image_base64?: string; image_mime?: string; ocr_data?: Record<string, unknown>; match_status?: string; match_score?: number }) =>
      request<FacturaResponse>('/api/facturas', { method: 'POST', body: data }),
    updateMatch: (id: string, data: { match_status: string; gasto_id: string; match_score?: number }) =>
      request<FacturaResponse>(`/api/facturas/${id}/match`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ deleted: boolean }>(`/api/facturas/${id}`, { method: 'DELETE' }),
  },

  // Empresas
  empresas: {
    list: () => request<EmpresaResponse[]>('/api/empresas'),
    get: (id: string) => request<EmpresaResponse>(`/api/empresas/${id}`),
    create: (data: { nombre: string; ruc: string; color?: string }) =>
      request<EmpresaResponse>('/api/empresas', { method: 'POST', body: data }),
    update: (id: string, data: { nombre?: string; ruc?: string; color?: string }) =>
      request<EmpresaResponse>(`/api/empresas/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ deleted: boolean }>(`/api/empresas/${id}`, { method: 'DELETE' }),
  },

  // Personal
  personal: {
    list: (params?: { empresa_id?: string; estado?: string; search?: string }) =>
      request<PersonalResponse[]>('/api/personal', { params }),
    get: (id: string) => request<PersonalResponse>(`/api/personal/${id}`),
    create: (data: Record<string, unknown>) =>
      request<PersonalResponse>('/api/personal', { method: 'POST', body: data }),
    update: (id: string, data: Record<string, unknown>) =>
      request<PersonalResponse>(`/api/personal/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ deleted: boolean }>(`/api/personal/${id}`, { method: 'DELETE' }),
  },

  // Asistencias
  asistencias: {
    list: (params?: { empresa_id?: string; personal_id?: string; desde?: string; hasta?: string }) =>
      request<AsistenciaResponse[]>('/api/asistencias', { params }),
    resumen: (params: { empresa_id: string; desde: string; hasta: string }) =>
      request<Record<string, unknown>[]>('/api/asistencias/resumen', { params }),
    create: (data: { personal_id: string; empresa_id: string; fecha: string; hora_entrada?: string; hora_salida?: string; tipo_hora_extra?: string; observacion?: string }) =>
      request<AsistenciaResponse>('/api/asistencias', { method: 'POST', body: data }),
    update: (id: string, data: { hora_entrada?: string; hora_salida?: string; tipo_hora_extra?: string; observacion?: string }) =>
      request<AsistenciaResponse>(`/api/asistencias/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ deleted: boolean }>(`/api/asistencias/${id}`, { method: 'DELETE' }),
  },

  // OCR
  ocr: {
    extract: (imageBase64: string, mimeType?: string) =>
      request<Record<string, unknown>>('/api/ocr', { method: 'POST', body: { imageBase64, mimeType } }),
  },
};

export interface GastoRow {
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
}

export interface FacturaRow {
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

export interface EmpresaRow {
  id: string;
  nombre: string;
  ruc: string;
  color: string;
  created_at: string;
}

export interface PersonalRow {
  id: string;
  empresa_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  cargo: string | null;
  tipo_contrato: 'planilla' | 'recibo_honorarios' | 'CAS' | 'practicante' | 'otro';
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'licencia';
  banco1: string | null;
  cuenta1: string | null;
  tipo_cuenta1: string | null;
  banco2: string | null;
  cuenta2: string | null;
  tipo_cuenta2: string | null;
  sueldo_base: number | null;
  created_at: string;
}

export interface AsistenciaRow {
  id: string;
  personal_id: string;
  empresa_id: string;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  horas_normales: number;
  horas_extras: number;
  tipo_hora_extra: 'normal' | 'nocturna' | 'feriado' | null;
  observacion: string | null;
}

export interface CreateGastoBody {
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: 'gasto' | 'ingreso';
  mensaje?: string;
  saldo?: number;
}

export interface UpdateGastoBody {
  estado?: 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
  mensaje?: string;
  descripcion?: string;
  monto?: number;
}

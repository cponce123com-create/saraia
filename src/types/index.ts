// ─── Estados de gasto ───────────────────────────────────────────
export type GastoEstado = 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
export type GastoForma = 'gasto' | 'ingreso';
export type MatchStatus = 'auto' | 'conflicto' | 'sin_match' | 'manual';
export type TipoComprobante = 'boleta' | 'factura' | 'ticket';

// ─── Gasto en el sistema ────────────────────────────────────────
export interface Gasto {
  id: string;
  empresaId: string;
  fecha: string; // ISO
  descripcion: string;
  monto: number;
  tipo: GastoForma;
  mensaje: string | null;
  saldo: number;
  facturaId: string | null;
  estado: GastoEstado;
  matchStatus?: string | null;
  facturaMonto?: number | null;
}

// ─── Gasto pendiente de importación (sin id ni estado) ──────────
export interface GastoPendiente {
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: GastoForma;
  mensaje: string | null;
  saldo: number;
}

// ─── Datos extraídos por OCR ────────────────────────────────────
export interface OCRData {
  fecha: string | null;
  monto: number | null;
  proveedor: string | null;
  ruc: string | null;
  tipo_comprobante: TipoComprobante | null;
  numero_comprobante: string | null;
}

// ─── Factura adjuntada ──────────────────────────────────────────
export interface Factura {
  id: string;
  gastoId: string;
  imageBase64: string;
  imageMime: string;
  ocrData: OCRData | null;
  matchStatus: MatchStatus;
  matchScore?: number;
  candidatos?: string[];
  createdAt: string; // ISO
}

// ─── Resultados de matching ────────────────────────────────────
export type MatchResultType = 'unico' | 'multiple' | 'ninguno';

export interface MatchScore {
  gasto: Gasto;
  score: number;
}

export interface MatchResult {
  match: MatchResultType;
  gastos: Gasto[];
  scores: MatchScore[];
}

export interface OpcionesMatch {
  toleranciaDias?: number;
  toleranciaMonto?: number;
  umbralUnico?: number;
  umbralMinimo?: number;
}

// ─── Resultado de importación ───────────────────────────────────
export interface ResultadoImportacion {
  insertados: number;
  duplicados: number;
}

// ─── Store ──────────────────────────────────────────────────────
export interface StoreState {
  gastos: Gasto[];
  facturas: Factura[];
  importaciones: Importacion[];
  loading: boolean;
  error: string | null;
}

export interface StoreActions {
  cargarGastos: (empresaId?: string) => Promise<void>;
  importarGastos: (nuevosGastos: GastoPendiente[], empresaId: string) => Promise<ResultadoImportacion>;
  eliminarGasto: (gastoId: string) => Promise<void>;
  eliminarImportacion: (importacionId: string) => void;
  adjuntarFactura: (gastoId: string, factura: Omit<Factura, 'id' | 'gastoId'>, empresaId?: string) => Promise<void>;
  actualizarEstado: (gastoId: string, estado: GastoEstado) => Promise<void>;
  asignarFactura: (facturaId: string, gastoId: string) => Promise<void>;
  getFactura: (gastoId: string) => Factura | null;
  limpiarTodo: () => Promise<void>;
  setEmpresaId: (id: string) => void;
}

export type Store = StoreState & StoreActions;

// ─── Parseo de Excel ────────────────────────────────────────────
export interface ResumenParseo {
  leidas: number;
  saltadas: number;
  totalFilas: number;
  errores: string[];
}

export interface ResultadoParseo {
  gastos: GastoPendiente[];
  resumen: ResumenParseo;
}

// ─── Props de componentes ───────────────────────────────────────
export interface AppLayoutProps {
  children: React.ReactNode;
}

export interface GastosListaProps {
  gastos: Gasto[];
  onAdjuntarFactura: (gasto: Gasto) => void;
  onVerFactura: (gasto: Gasto) => void;
  onEliminar?: (gastoId: string) => void;
}

export interface CamaraModalProps {
  gasto: Gasto;
  onClose: () => void;
}

export interface ComprobanteModalProps {
  factura: Factura;
  onClose: () => void;
}

// ─── Módulo RR.HH. ──────────────────────────────────────────────

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  color: string; // hex para identificación visual
  createdAt: string;
}

export type TipoCuenta = 'ahorro' | 'corriente' | 'CTS' | 'interbancario';
export type TipoBanco = 'BCP' | 'BBVA' | 'Interbank' | 'Scotiabank' | 'BanBif' | 'Pichincha' | 'Nacion' | 'Otro';
export type TipoContrato = 'planilla' | 'recibo_honorarios' | 'CAS' | 'practicante' | 'otro';
export type EstadoPersonal = 'activo' | 'inactivo' | 'vacaciones' | 'licencia';

export interface Personal {
  id: string;
  empresaId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  cargo: string | null;
  tipoContrato: TipoContrato;
  estado: EstadoPersonal;
  // Datos bancarios cuenta 1
  banco1: TipoBanco | null;
  numeroCuenta1: string | null;
  tipoCuenta1: TipoCuenta | null;
  // Datos bancarios cuenta 2
  banco2: TipoBanco | null;
  numeroCuenta2: string | null;
  tipoCuenta2: TipoCuenta | null;
  // Remuneración
  sueldoBase: number | null;
  createdAt: string;
}

export type TipoRegistro = 'entrada' | 'salida' | 'entrada_tarde' | 'salida_anticipada';
export type TipoHoraExtra = 'normal' | 'nocturna' | 'feriado';

export interface RegistroAsistencia {
  id: string;
  personalId: string;
  empresaId: string;
  fecha: string; // YYYY-MM-DD
  horaEntrada: string | null; // HH:MM
  horaSalida: string | null;  // HH:MM
  horasNormales: number; // calculado
  horasExtras: number;  // calculado
  tipoHoraExtra: TipoHoraExtra | null;
  observacion: string | null;
}

export interface ResumenSemanalPersonal {
  personalId: number;
  nombres: string;
  apellidos: string;
  totalHorasNormales: number;
  totalHorasExtras: number;
  totalDiasTrabajados: number;
  diasFaltantes: number;
  tardanzas: number;
}

// ─── Store de RR.HH. ──────────────────────────────────────────────

export interface HRStoreState {
  empresas: Empresa[];
  personal: Personal[];
  asistencias: RegistroAsistencia[];
  empresaActivaId: string | null;
  loading: boolean;
  error: string | null;
}

export interface HRStoreActions {
  cargarEmpresas: () => Promise<void>;
  agregarEmpresa: (data: Omit<Empresa, 'id' | 'createdAt'>) => Promise<Empresa>;
  editarEmpresa: (id: string, data: Partial<Empresa>) => Promise<void>;
  eliminarEmpresa: (id: string) => Promise<void>;
  setEmpresaActiva: (id: string | null) => void;
  // Personal
  cargarPersonal: (empresaId?: string) => Promise<void>;
  agregarPersonal: (data: Omit<Personal, 'id' | 'createdAt'>) => Promise<Personal>;
  editarPersonal: (id: string, data: Partial<Personal>) => Promise<void>;
  eliminarPersonal: (id: string) => Promise<void>;
  getPersonalDeEmpresa: (empresaId: string) => Personal[];
  // Asistencias
  cargarAsistencias: (params?: { empresaId?: string; personalId?: string; desde?: string; hasta?: string }) => Promise<void>;
  registrarAsistencia: (data: Omit<RegistroAsistencia, 'id' | 'horasNormales' | 'horasExtras'>) => Promise<RegistroAsistencia>;
  editarAsistencia: (id: string, data: Partial<RegistroAsistencia>) => Promise<void>;
  eliminarAsistencia: (id: string) => Promise<void>;
  getAsistenciasPorPeriodo: (empresaId: string, desde: string, hasta: string) => RegistroAsistencia[];
  calcularResumenPeriodo: (empresaId: string, desde: string, hasta: string) => ResumenSemanalPersonal[];
  cargarDatosDemo: () => void;
}

export type HRStore = HRStoreState & HRStoreActions;

// ─── Importación ────────────────────────────────────────────────
export interface Importacion {
  id: string;
  fecha: string; // ISO
  cantidad: number;
  duplicados: number;
  gastoIds: string[]; // IDs de gastos asociados a esta importación
}

// ─── Tipos Supabase (snake_case, como vienen de la BD) ──────────

export interface Perfil {
  id: string;
  empresa_id: string | null;
  rol: 'gerente' | 'contador' | 'supervisor' | 'lectura';
  nombre: string;
}

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
  tipo_hora_extra: string | null;
  observacion: string | null;
  created_at: string;
}

export interface EmpresaRow {
  id: string;
  nombre: string;
  ruc: string;
  color: string;
  created_at: string;
}

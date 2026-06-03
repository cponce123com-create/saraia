// ─── Estados de gasto ───────────────────────────────────────────
export type GastoEstado = 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
export type GastoForma = 'gasto' | 'ingreso';
export type MatchStatus = 'auto' | 'conflicto' | 'sin_match' | 'manual';
export type TipoComprobante = 'boleta' | 'factura' | 'ticket';

// ─── Gasto en el sistema ────────────────────────────────────────
export interface Gasto {
  id: number;
  fecha: string; // ISO
  descripcion: string;
  monto: number;
  tipo: GastoForma;
  mensaje: string | null;
  saldo: number;
  facturaId: number | null;
  estado: GastoEstado;
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
  id: number;
  gastoId: number;
  imageBase64: string;
  imageMime: string;
  ocrData: OCRData | null;
  matchStatus: MatchStatus;
  matchScore?: number;
  candidatos?: number[];
  createdAt: string; // ISO
}

// ─── Registro de importación ────────────────────────────────────
export interface Importacion {
  id: number;
  fecha: string; // ISO
  cantidad: number;
  duplicados: number;
  gastoIds: number[]; // IDs de gastos asociados a esta importación
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
  proximoId: number;
  importaciones: Importacion[];
}

export interface StoreActions {
  importarGastos: (nuevosGastos: GastoPendiente[]) => ResultadoImportacion;
  eliminarGasto: (gastoId: number) => void;
  eliminarImportacion: (importacionId: number) => void;
  adjuntarFactura: (gastoId: number, factura: Omit<Factura, 'id' | 'gastoId'>) => void;
  actualizarEstado: (gastoId: number, estado: GastoEstado) => void;
  asignarFactura: (facturaId: number, gastoId: number) => void;
  getFactura: (gastoId: number) => Factura | null;
  limpiarTodo: () => void;
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
  onEliminar?: (gastoId: number) => void;
}

export interface CamaraModalProps {
  gasto: Gasto;
  onClose: () => void;
}

export interface ComprobanteModalProps {
  factura: Factura;
  onClose: () => void;
}

// ─── Vite env ────────────────────────────────────────────────────
// Declared in vite-env.d.ts

// ─── Módulo RR.HH. ──────────────────────────────────────────────

export interface Empresa {
  id: number;
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
  id: number;
  empresaId: number;
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
  id: number;
  personalId: number;
  empresaId: number;
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
  empresaActivaId: number | null;
  proximoIdHR: number;
}

export interface HRStoreActions {
  agregarEmpresa: (data: Omit<Empresa, 'id' | 'createdAt'>) => Empresa;
  editarEmpresa: (id: number, data: Partial<Empresa>) => void;
  eliminarEmpresa: (id: number) => void;
  setEmpresaActiva: (id: number | null) => void;
  // Personal
  agregarPersonal: (data: Omit<Personal, 'id' | 'createdAt'>) => Personal;
  editarPersonal: (id: number, data: Partial<Personal>) => void;
  eliminarPersonal: (id: number) => void;
  getPersonalDeEmpresa: (empresaId: number) => Personal[];
  // Asistencias
  registrarAsistencia: (data: Omit<RegistroAsistencia, 'id' | 'horasNormales' | 'horasExtras'>) => RegistroAsistencia;
  editarAsistencia: (id: number, data: Partial<RegistroAsistencia>) => void;
  eliminarAsistencia: (id: number) => void;
  getAsistenciasPorPeriodo: (empresaId: number, desde: string, hasta: string) => RegistroAsistencia[];
  calcularResumenPeriodo: (empresaId: number, desde: string, hasta: string) => ResumenSemanalPersonal[];
  cargarDatosDemo: () => void;
}

export type HRStore = HRStoreState & HRStoreActions;

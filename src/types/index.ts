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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa las variables.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);

// ─── Tipos generados manualmente (basados en esquema SQL) ────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nombre: string;
          ruc: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          ruc: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          ruc?: string;
          color?: string;
          created_at?: string;
        };
      };
      perfiles: {
        Row: {
          id: string;
          empresa_id: string | null;
          rol: 'gerente' | 'contador' | 'supervisor' | 'lectura';
          nombre: string;
          created_at: string;
        };
        Insert: {
          id: string;
          empresa_id?: string | null;
          rol?: 'gerente' | 'contador' | 'supervisor' | 'lectura';
          nombre: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string | null;
          rol?: 'gerente' | 'contador' | 'supervisor' | 'lectura';
          nombre?: string;
          created_at?: string;
        };
      };
      gastos: {
        Row: {
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
        };
        Insert: {
          id?: string;
          empresa_id: string;
          fecha: string;
          descripcion: string;
          monto: number;
          tipo: 'gasto' | 'ingreso';
          mensaje?: string | null;
          saldo?: number | null;
          estado?: 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          fecha?: string;
          descripcion?: string;
          monto?: number;
          tipo?: 'gasto' | 'ingreso';
          mensaje?: string | null;
          saldo?: number | null;
          estado?: 'pendiente' | 'verificado' | 'conflicto' | 'sin_factura';
          created_at?: string;
        };
      };
      facturas: {
        Row: {
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
        };
        Insert: {
          id?: string;
          gasto_id: string;
          image_base64?: string | null;
          image_mime?: string;
          ocr_fecha?: string | null;
          ocr_monto?: number | null;
          ocr_proveedor?: string | null;
          ocr_ruc?: string | null;
          ocr_tipo?: string | null;
          ocr_numero?: string | null;
          match_status?: 'auto' | 'conflicto' | 'sin_match' | 'manual';
          match_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gasto_id?: string;
          image_base64?: string | null;
          image_mime?: string;
          ocr_fecha?: string | null;
          ocr_monto?: number | null;
          ocr_proveedor?: string | null;
          ocr_ruc?: string | null;
          ocr_tipo?: string | null;
          ocr_numero?: string | null;
          match_status?: 'auto' | 'conflicto' | 'sin_match' | 'manual';
          match_score?: number | null;
          created_at?: string;
        };
      };
      personal: {
        Row: {
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
        };
        Insert: {
          id?: string;
          empresa_id: string;
          dni: string;
          nombres: string;
          apellidos: string;
          celular?: string | null;
          correo?: string | null;
          cargo?: string | null;
          tipo_contrato: 'planilla' | 'recibo_honorarios' | 'CAS' | 'practicante' | 'otro';
          estado: 'activo' | 'inactivo' | 'vacaciones' | 'licencia';
          banco1?: string | null;
          cuenta1?: string | null;
          tipo_cuenta1?: string | null;
          banco2?: string | null;
          cuenta2?: string | null;
          tipo_cuenta2?: string | null;
          sueldo_base?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          empresa_id?: string;
          dni?: string;
          nombres?: string;
          apellidos?: string;
          celular?: string | null;
          correo?: string | null;
          cargo?: string | null;
          tipo_contrato?: 'planilla' | 'recibo_honorarios' | 'CAS' | 'practicante' | 'otro';
          estado?: 'activo' | 'inactivo' | 'vacaciones' | 'licencia';
          banco1?: string | null;
          cuenta1?: string | null;
          tipo_cuenta1?: string | null;
          banco2?: string | null;
          cuenta2?: string | null;
          tipo_cuenta2?: string | null;
          sueldo_base?: number | null;
          created_at?: string;
        };
      };
      asistencias: {
        Row: {
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
        };
        Insert: {
          id?: string;
          personal_id: string;
          empresa_id: string;
          fecha: string;
          hora_entrada?: string | null;
          hora_salida?: string | null;
          tipo_hora_extra?: string | null;
          observacion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          personal_id?: string;
          empresa_id?: string;
          fecha?: string;
          hora_entrada?: string | null;
          hora_salida?: string | null;
          tipo_hora_extra?: string | null;
          observacion?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

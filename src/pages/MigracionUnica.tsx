import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, CheckCircle2, AlertCircle, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { GastoEstado, GastoForma } from '../types';

// ─── Tipos del localStorage ────────────────────────────────────────

interface LocalGasto {
  id: number;
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: string;
  mensaje?: string;
  saldo?: number;
  estado: string;
  facturaId?: number;
}

interface LocalFactura {
  id: number;
  gastoId: number;
  imageBase64: string;
  imageMime: string;
  ocrData?: {
    fecha?: string;
    monto?: number;
    proveedor?: string;
    ruc?: string;
    tipo_comprobante?: string;
    numero_comprobante?: string;
  };
  matchStatus: string;
  matchScore?: number;
}

interface LocalPersonal {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  celular?: string;
  correo?: string;
  cargo?: string;
  tipoContrato: string;
  estado: string;
  banco1?: string; numeroCuenta1?: string; tipoCuenta1?: string;
  banco2?: string; numeroCuenta2?: string; tipoCuenta2?: string;
  sueldoBase?: number;
}

interface LocalAsistencia {
  id: number;
  personalId: number;
  fecha: string;
  horaEntrada?: string;
  horaSalida?: string;
  tipoHoraExtra?: string;
  observacion?: string;
}

interface LocalHRData {
  personal: LocalPersonal[];
  asistencias: LocalAsistencia[];
}

type LogEntry = { tipo: 'info' | 'exito' | 'error' | 'advertencia'; mensaje: string };

export default function MigracionUnica() {
  const navigate = useNavigate();
  const { perfil, user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [gastos, setGastos] = useState<LocalGasto[]>([]);
  const [facturas, setFacturas] = useState<LocalFactura[]>([]);
  const [hrData, setHrData] = useState<LocalHRData | null>(null);
  const [migrando, setMigrando] = useState(false);
  const [migrado, setMigrado] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [totalFacturas, setTotalFacturas] = useState(0);
  const [totalPersonal, setTotalPersonal] = useState(0);
  const [totalAsistencias, setTotalAsistencias] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  };

  // Leer localStorage al montar
  useEffect(() => {
    if (!perfil || !user) return;

    setEmpresaId(perfil.empresa_id);

    try {
      const rawGastos = localStorage.getItem('saraia-data');
      const rawHR = localStorage.getItem('saraia-hr-data');

      if (rawGastos) {
        const parsed = JSON.parse(rawGastos);
        const gastosArr = (parsed.gastos || []) as LocalGasto[];
        const facturasArr = (parsed.facturas || []) as LocalFactura[];
        setGastos(gastosArr);
        setFacturas(facturasArr);
        setTotalGastos(gastosArr.length);
        setTotalFacturas(facturasArr.length);
      }

      if (rawHR) {
        const parsed = JSON.parse(rawHR) as LocalHRData;
        setHrData(parsed);
        setTotalPersonal((parsed.personal || []).length);
        setTotalAsistencias((parsed.asistencias || []).length);
      }
    } catch (err) {
      addLog({ tipo: 'error', mensaje: 'Error al leer localStorage: ' + (err instanceof Error ? err.message : String(err)) });
    }
  }, [perfil, user]);

  const iniciarMigracion = async () => {
    if (!empresaId || !user) return;

    setMigrando(true);
    setMigrado(false);
    cancelRef.current = false;
    setLogs([]);

    try {
      // ─── Paso 1: Migrar gastos ────────────────────────────────
      addLog({ tipo: 'info', mensaje: `Migrando ${gastos.length} gastos...` });
      let gastosMigrados = 0;
      const mapaIds = new Map<number, string>(); // id numérico → uuid

      for (const g of gastos) {
        if (cancelRef.current) break;
        try {
          const { data, error } = await supabase
            .from('gastos')
            .insert({
              empresa_id: empresaId,
              fecha: g.fecha.split('T')[0],
              descripcion: g.descripcion,
              monto: g.monto,
              tipo: g.tipo as GastoForma,
              mensaje: g.mensaje || null,
              saldo: g.saldo ?? g.monto,
              estado: g.estado as GastoEstado,
            })
            .select('id')
            .single();

          if (error) {
            addLog({ tipo: 'advertencia', mensaje: `Gasto #${g.id}: ${error.message}` });
          } else if (data) {
            mapaIds.set(g.id, data.id);
            gastosMigrados++;
          }
        } catch (err) {
          addLog({ tipo: 'advertencia', mensaje: `Gasto #${g.id}: error al insertar` });
        }
      }

      addLog({ tipo: 'exito', mensaje: `✓ ${gastosMigrados}/${gastos.length} gastos migrados` });

      // ─── Paso 2: Migrar facturas ──────────────────────────────
      addLog({ tipo: 'info', mensaje: `Migrando ${facturas.length} facturas...` });
      let facturasMigradas = 0;

      for (const f of facturas) {
        if (cancelRef.current) break;

        // Resolver gasto_id por monto+descripción
        const gastoOriginal = gastos.find((g) => g.id === f.gastoId);
        const gastoUuid = gastoOriginal ? mapaIds.get(gastoOriginal.id) : null;

        if (!gastoUuid) {
          addLog({ tipo: 'advertencia', mensaje: `Factura #${f.id}: no se encontró gasto relacionado` });
          continue;
        }

        try {
          const { error } = await supabase.from('facturas').insert({
            gasto_id: gastoUuid,
            image_base64: f.imageBase64 || null,
            image_mime: f.imageMime || 'image/jpeg',
            ocr_fecha: f.ocrData?.fecha || null,
            ocr_monto: f.ocrData?.monto || null,
            ocr_proveedor: f.ocrData?.proveedor || null,
            ocr_ruc: f.ocrData?.ruc || null,
            ocr_tipo: f.ocrData?.tipo_comprobante || null,
            ocr_numero: f.ocrData?.numero_comprobante || null,
            match_status: f.matchStatus || 'sin_match',
            match_score: f.matchScore || null,
          });

          if (error) {
            addLog({ tipo: 'advertencia', mensaje: `Factura #${f.id}: ${error.message}` });
          } else {
            facturasMigradas++;
          }
        } catch {
          addLog({ tipo: 'advertencia', mensaje: `Factura #${f.id}: error al insertar` });
        }
      }

      addLog({ tipo: 'exito', mensaje: `✓ ${facturasMigradas}/${facturas.length} facturas migradas` });

      // ─── Paso 3: Migrar personal ──────────────────────────────
      if (hrData?.personal) {
        addLog({ tipo: 'info', mensaje: `Migrando ${hrData.personal.length} personas...` });
        let personalMigrado = 0;
        const mapaPersonal = new Map<number, string>(); // id numérico → uuid

        for (const p of hrData.personal) {
          if (cancelRef.current) break;
          try {
            const { data, error } = await supabase
              .from('personal')
              .insert({
                empresa_id: empresaId,
                dni: p.dni,
                nombres: p.nombres,
                apellidos: p.apellidos,
                celular: p.celular || null,
                correo: p.correo || null,
                cargo: p.cargo || null,
                tipo_contrato: p.tipoContrato,
                estado: p.estado,
                banco1: p.banco1 || null,
                cuenta1: p.numeroCuenta1 || null,
                tipo_cuenta1: p.tipoCuenta1 || null,
                banco2: p.banco2 || null,
                cuenta2: p.numeroCuenta2 || null,
                tipo_cuenta2: p.tipoCuenta2 || null,
                sueldo_base: p.sueldoBase || null,
              })
              .select('id')
              .single();

            if (error) {
              addLog({ tipo: 'advertencia', mensaje: `Personal DNI ${p.dni}: ${error.message}` });
            } else if (data) {
              mapaPersonal.set(p.id, data.id);
              personalMigrado++;
            }
          } catch {
            addLog({ tipo: 'advertencia', mensaje: `Personal DNI ${p.dni}: error al insertar` });
          }
        }

        addLog({ tipo: 'exito', mensaje: `✓ ${personalMigrado}/${hrData.personal.length} personas migradas` });

        // ─── Paso 4: Migrar asistencias ─────────────────────────
        if (hrData.asistencias) {
          addLog({ tipo: 'info', mensaje: `Migrando ${hrData.asistencias.length} asistencias...` });
          let asistenciasMigradas = 0;

          for (const a of hrData.asistencias) {
            if (cancelRef.current) break;

            // Resolver personal_id por DNI
            const persona = hrData.personal.find((p) => p.id === a.personalId);
            const personalUuid = persona ? mapaPersonal.get(persona.id) : null;

            if (!personalUuid) {
              addLog({ tipo: 'advertencia', mensaje: `Asistencia #${a.id}: no se encontró personal relacionado` });
              continue;
            }

            try {
              const { error } = await supabase.from('asistencias').insert({
                personal_id: personalUuid,
                empresa_id: empresaId,
                fecha: a.fecha,
                hora_entrada: a.horaEntrada || null,
                hora_salida: a.horaSalida || null,
                tipo_hora_extra: a.tipoHoraExtra || null,
                observacion: a.observacion || null,
              });

              if (error) {
                addLog({ tipo: 'advertencia', mensaje: `Asistencia #${a.id}: ${error.message}` });
              } else {
                asistenciasMigradas++;
              }
            } catch {
              addLog({ tipo: 'advertencia', mensaje: `Asistencia #${a.id}: error al insertar` });
            }
          }

          addLog({ tipo: 'exito', mensaje: `✓ ${asistenciasMigradas}/${hrData.asistencias.length} asistencias migradas` });
        }
      }

      setMigrado(true);
      addLog({ tipo: 'exito', mensaje: '🎉 Migración completada exitosamente' });
    } catch (err) {
      addLog({ tipo: 'error', mensaje: 'Error general: ' + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setMigrando(false);
    }
  };

  const limpiarLocalStorage = () => {
    localStorage.removeItem('saraia-data');
    localStorage.removeItem('saraia-hr-data');
    addLog({ tipo: 'exito', mensaje: '🧹 localStorage limpiado exitosamente' });
    setGastos([]);
    setFacturas([]);
    setHrData(null);
    setTotalGastos(0);
    setTotalFacturas(0);
    setTotalPersonal(0);
    setTotalAsistencias(0);
  };

  if (!perfil) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 mb-2 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </button>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database size={24} className="text-blue-600" />
            Migración de Datos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Transfiere datos de localStorage a Supabase
          </p>
        </div>
      </div>

      {/* Resumen de datos encontrados */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos encontrados en localStorage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{totalGastos}</p>
            <p className="text-xs text-blue-600">Gastos</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{totalFacturas}</p>
            <p className="text-xs text-purple-600">Facturas</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totalPersonal}</p>
            <p className="text-xs text-green-600">Personal</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">{totalAsistencias}</p>
            <p className="text-xs text-orange-600">Asistencias</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Empresa destino: <strong>{perfil.empresa_id || 'No asignada'}</strong>
        </p>
      </div>

      {/* Botón de migración */}
      <div className="flex gap-3">
        <button
          onClick={iniciarMigracion}
          disabled={migrando || migrado || (!totalGastos && !totalPersonal) || !empresaId}
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {migrando ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Migrando datos...
            </>
          ) : migrado ? (
            <>
              <CheckCircle2 size={20} />
              Migración completada
            </>
          ) : (
            <>
              <Database size={20} />
              Iniciar Migración
            </>
          )}
        </button>

        {migrado && (
          <button
            onClick={limpiarLocalStorage}
            className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-all flex items-center gap-2"
          >
            <Trash2 size={18} />
            Limpiar localStorage
          </button>
        )}
      </div>

      {/* Log en tiempo real */}
      {logs.length > 0 && (
        <div
          ref={logRef}
          className="bg-gray-900 text-gray-100 rounded-xl p-4 max-h-80 overflow-y-auto text-sm font-mono space-y-1"
        >
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              {log.tipo === 'exito' && <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />}
              {log.tipo === 'error' && <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />}
              {log.tipo === 'info' && <Loader2 size={14} className="text-blue-400 mt-0.5 shrink-0 animate-spin" />}
              {log.tipo === 'advertencia' && <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />}
              <span className={
                log.tipo === 'exito' ? 'text-green-300' :
                log.tipo === 'error' ? 'text-red-300' :
                log.tipo === 'advertencia' ? 'text-yellow-300' :
                'text-blue-300'
              }>
                {log.mensaje}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Checklist de verificación */}
      {migrado && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist de verificación manual</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-gray-300" />
              <span>Verifica que los gastos aparecen en la sección Gastos</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-gray-300" />
              <span>Verifica que el personal aparece en la sección Personal</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-gray-300" />
              <span>Verifica que las asistencias aparecen en Control de Asistencia</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-gray-300" />
              <span>Verifica que las facturas/imágenes se migraron correctamente</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 rounded border-gray-300" />
              <span>Confirma que los totales coinciden con los datos originales</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

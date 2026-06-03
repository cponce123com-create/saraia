import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import type { Personal, RegistroAsistencia, TipoHoraExtra } from '../types';

interface AsistenciaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<RegistroAsistencia, 'id' | 'horasNormales' | 'horasExtras'>) => void;
  onMarcarFalta: (personalId: number, empresaId: number, fecha: string) => void;
  personal: Personal;
  fecha: string;
  empresaId: number;
  initial?: RegistroAsistencia | null;
}

const TIPOS_HE: TipoHoraExtra[] = ['normal', 'nocturna', 'feriado'];

const JORNADA_MINUTOS = 480;

function calcularPreview(entrada: string, salida: string): { normales: number; extras: number } | null {
  if (!entrada || !salida) return null;
  const [he, me] = entrada.split(':').map(Number);
  const [hs, ms] = salida.split(':').map(Number);
  if (isNaN(he) || isNaN(me) || isNaN(hs) || isNaN(ms)) return null;
  const totalMin = (hs * 60 + ms) - (he * 60 + me);
  if (totalMin <= 0) return null;
  if (totalMin <= JORNADA_MINUTOS) return { normales: +(totalMin / 60).toFixed(2), extras: 0 };
  return {
    normales: +(JORNADA_MINUTOS / 60).toFixed(2),
    extras: +((totalMin - JORNADA_MINUTOS) / 60).toFixed(2),
  };
}

export default function AsistenciaModal({ open, onClose, onSave, onMarcarFalta, personal, fecha, empresaId, initial }: AsistenciaModalProps) {
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [tipoHE, setTipoHE] = useState<TipoHoraExtra>('normal');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (initial) {
      setEntrada(initial.horaEntrada || '');
      setSalida(initial.horaSalida || '');
      setTipoHE(initial.tipoHoraExtra || 'normal');
      setObservacion(initial.observacion || '');
    } else {
      setEntrada('');
      setSalida('');
      setTipoHE('normal');
      setObservacion('');
    }
  }, [initial, open]);

  if (!open) return null;

  const preview = calcularPreview(entrada, salida);
  const tieneExtras = preview && preview.extras > 0;

  const handleSave = () => {
    onSave({
      personalId: personal.id,
      empresaId,
      fecha,
      horaEntrada: entrada || null,
      horaSalida: salida || null,
      tipoHoraExtra: tieneExtras ? tipoHE : null,
      observacion: observacion || null,
    });
    onClose();
  };

  const handleMarcarFalta = () => {
    onMarcarFalta(personal.id, empresaId, fecha);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold">Registro de Asistencia</h2>
            <p className="text-sm text-gray-500 mt-0.5">{personal.nombres} {personal.apellidos}</p>
            <p className="text-xs text-gray-400">{fecha}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Entrada</label>
              <input
                type="time"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Salida</label>
              <input
                type="time"
                value={salida}
                onChange={(e) => setSalida(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                <Clock size={16} />
                Vista previa
              </div>
              <p className="text-blue-600">
                {preview.normales} h normales
                {preview.extras > 0 && (
                  <span className="text-orange-600"> + {preview.extras} h extras</span>
                )}
              </p>
            </div>
          )}

          {tieneExtras && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo Hora Extra</label>
              <select
                value={tipoHE}
                onChange={(e) => setTipoHE(e.target.value as TipoHoraExtra)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {TIPOS_HE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Observación</label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Opcional"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleMarcarFalta}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Marcar falta
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

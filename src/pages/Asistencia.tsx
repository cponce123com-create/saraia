import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Building, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useHRStore from '../store/hrStore';
import AsistenciaModal from '../components/AsistenciaModal';
import { exportarAsistenciaPeriodo } from '../utils/hrExport';
import type { Personal, RegistroAsistencia } from '../types';

function getWeekRange(fecha: Date): { desde: string; hasta: string } {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  const desde = d.toISOString().split('T')[0];
  d.setDate(d.getDate() + 6);
  const hasta = d.toISOString().split('T')[0];
  return { desde, hasta };
}

function getMonthRange(fecha: Date): { desde: string; hasta: string } {
  const d = new Date(fecha);
  const desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const hasta = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
  return { desde, hasta };
}

function generarDias(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const start = new Date(desde);
  const end = new Date(hasta);
  const current = new Date(start);
  while (current <= end) {
    dias.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dias;
}

function formatDiaCorto(dateStr: string): string {
  const d = new Date(dateStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${dias[d.getDay()]} ${d.getDate()}`;
}

export default function Asistencia() {
  const navigate = useNavigate();
  const { empresas, empresaActivaId, getPersonalDeEmpresa, getAsistenciasPorPeriodo, setEmpresaActiva, registrarAsistencia, editarAsistencia, eliminarAsistencia } = useHRStore();

  const [vista, setVista] = useState<'semana' | 'mes'>('semana');
  const [fechaRef, setFechaRef] = useState(new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<Personal | null>(null);
  const [selectedFecha, setSelectedFecha] = useState('');
  const [selectedAsistencia, setSelectedAsistencia] = useState<RegistroAsistencia | null>(null);

  const empresaActiva = empresas.find((e) => e.id === empresaActivaId);

  useEffect(() => {
    if (empresas.length > 0 && !empresaActivaId) {
      navigate('/empresas');
    }
  }, [empresaActivaId, empresas.length, navigate]);

  const rango = useMemo(() => {
    const d = new Date(fechaRef);
    return vista === 'semana' ? getWeekRange(d) : getMonthRange(d);
  }, [fechaRef, vista]);

  const personalEmpresa = empresaActivaId ? getPersonalDeEmpresa(empresaActivaId) : [];
  const asistenciasPeriodo = empresaActivaId ? getAsistenciasPorPeriodo(empresaActivaId, rango.desde, rango.hasta) : [];
  const dias = useMemo(() => generarDias(rango.desde, rango.hasta), [rango]);

  const asistenciasPorPersonaYFecha = useMemo(() => {
    const map = new Map<string, RegistroAsistencia>();
    for (const a of asistenciasPeriodo) {
      map.set(`${a.personalId}_${a.fecha}`, a);
    }
    return map;
  }, [asistenciasPeriodo]);

  const resumenPorPersona = useMemo(() => {
    return personalEmpresa.map((p) => {
      const regs = asistenciasPeriodo.filter((a) => a.personalId === p.id);
      return {
        personalId: p.id,
        totalHN: regs.reduce((s, a) => s + a.horasNormales, 0),
        totalHE: regs.reduce((s, a) => s + a.horasExtras, 0),
        diasConRegistro: new Set(regs.map((a) => a.fecha)).size,
      };
    });
  }, [personalEmpresa, asistenciasPeriodo]);

  const handleCeldaClick = (persona: Personal, fecha: string) => {
    const key = `${persona.id}_${fecha}`;
    const existente = asistenciasPorPersonaYFecha.get(key) || null;
    setSelectedPersonal(persona);
    setSelectedFecha(fecha);
    setSelectedAsistencia(existente);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<RegistroAsistencia, 'id' | 'horasNormales' | 'horasExtras'>) => {
    if (selectedAsistencia) {
      editarAsistencia(selectedAsistencia.id, data);
      toast.success('Asistencia actualizada');
    } else {
      registrarAsistencia(data);
      toast.success('Asistencia registrada');
    }
  };

  const handleMarcarFalta = (personalId: string, _empresaId: string, fecha: string) => {
    const key = `${personalId}_${fecha}`;
    const existente = asistenciasPorPersonaYFecha.get(key);
    if (existente) {
      eliminarAsistencia(existente.id);
    }
    toast.success('Marcado como falta');
  };

  const handlePrev = () => {
    const d = new Date(fechaRef);
    d.setDate(d.getDate() - (vista === 'semana' ? 7 : 30));
    setFechaRef(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const d = new Date(fechaRef);
    d.setDate(d.getDate() + (vista === 'semana' ? 7 : 30));
    setFechaRef(d.toISOString().split('T')[0]);
  };

  const handleExport = () => {
    if (!empresaActiva) return;
    exportarAsistenciaPeriodo(empresaActiva, personalEmpresa, asistenciasPeriodo, rango.desde, rango.hasta);
    toast.success('Reporte exportado');
  };

  if (!empresaActiva) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Building size={48} className="mb-4" />
        <p className="text-lg font-medium">Primero selecciona una empresa</p>
        <button onClick={() => navigate('/empresas')} className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
          Ir a Empresas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building size={16} className="text-blue-200" />
              <span className="text-sm text-blue-200">{empresaActiva.nombre}</span>
            </div>
            <h1 className="text-xl font-bold">Control de Asistencia</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={empresaActivaId || ''}
              onChange={(e) => setEmpresaActiva(parseInt(e.target.value))}
              className="bg-white/20 text-white text-sm rounded-lg px-3 py-2 border border-white/30 outline-none"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id} className="text-gray-900">{e.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Controles de período */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-900">
            {formatDiaCorto(rango.desde)} — {formatDiaCorto(rango.hasta)}
          </span>
          <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setVista('semana')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${vista === 'semana' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setVista('mes')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${vista === 'mes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Mes
            </button>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabla de asistencia */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="sticky left-0 bg-gray-50 z-10 text-left px-3 py-2.5 text-xs font-semibold text-gray-500 min-w-[160px]">Colaborador</th>
              {dias.map((dia) => (
                <th key={dia} className="text-center px-2 py-2.5 text-xs font-semibold text-gray-500 min-w-[80px]">
                  {formatDiaCorto(dia)}
                </th>
              ))}
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 min-w-[70px]">HN</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 min-w-[70px]">HE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {personalEmpresa.map((persona) => {
              const resumen = resumenPorPersona.find((r) => r.personalId === persona.id);
              return (
                <tr key={persona.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-100">
                    {persona.nombres.split(' ')[0]} {persona.apellidos.split(' ')[0]}
                  </td>
                  {dias.map((dia) => {
                    const key = `${persona.id}_${dia}`;
                    const registro = asistenciasPorPersonaYFecha.get(key);
                    const isWeekend = new Date(dia).getDay() === 0 || new Date(dia).getDay() === 6;
                    return (
                      <td
                        key={key}
                        onClick={() => handleCeldaClick(persona, dia)}
                        className={`text-center px-2 py-2 cursor-pointer hover:bg-blue-50 transition-colors text-xs ${isWeekend ? 'bg-gray-50' : ''}`}
                      >
                        {registro ? (
                          <span className="text-blue-700 font-medium">
                            {registro.horaEntrada?.slice(0, 5) || '--'}-{registro.horaSalida?.slice(0, 5) || '--'}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-2 text-sm font-medium text-gray-800">
                    {resumen ? resumen.totalHN.toFixed(1) : '0.0'}
                  </td>
                  <td className="text-center px-3 py-2 text-sm font-medium text-orange-600">
                    {resumen && resumen.totalHE > 0 ? resumen.totalHE.toFixed(1) : '0.0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {personalEmpresa.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Clock size={48} className="mb-4" />
          <p className="text-lg font-medium">No hay colaboradores en esta empresa</p>
          <p className="text-sm mt-1">Agrega personal desde la sección Personal</p>
        </div>
      )}

      {selectedPersonal && (
        <AsistenciaModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedPersonal(null); setSelectedAsistencia(null); }}
          onSave={handleSave}
          onMarcarFalta={handleMarcarFalta}
          personal={selectedPersonal}
          fecha={selectedFecha}
          empresaId={empresaActivaId!}
          initial={selectedAsistencia}
        />
      )}
    </div>
  );
}

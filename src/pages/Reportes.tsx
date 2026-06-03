import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Building, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import useHRStore from '../store/hrStore';
import { exportarDirectorioPersonal, exportarDatosPago, exportarAsistenciaPeriodo } from '../utils/hrExport';

export default function Reportes() {
  const navigate = useNavigate();
  const { empresas, empresaActivaId, getPersonalDeEmpresa, getAsistenciasPorPeriodo, setEmpresaActiva } = useHRStore();
  const [tab, setTab] = useState<'boletas' | 'asistencia' | 'directorio'>('boletas');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const empresaActiva = empresas.find((e) => e.id === empresaActivaId);

  const personalEmpresa = empresaActivaId ? getPersonalDeEmpresa(empresaActivaId) : [];

  const desdeMes = `${mes}-01`;
  const ultimoDia = new Date(parseInt(mes.split('-')[0]), parseInt(mes.split('-')[1]), 0).getDate();
  const hastaMes = `${mes}-${String(ultimoDia).padStart(2, '0')}`;

  const asistenciasMes = empresaActivaId ? getAsistenciasPorPeriodo(empresaActivaId, desdeMes, hastaMes) : [];

  const resumenMes = useMemo(() => {
    if (!empresaActivaId) return [];
    return personalEmpresa.map((p) => {
      const regs = asistenciasMes.filter((a) => a.personalId === p.id);
      const totalHN = regs.reduce((s, a) => s + a.horasNormales, 0);
      const totalHE = regs.reduce((s, a) => s + a.horasExtras, 0);
      const start = new Date(desdeMes);
      const end = new Date(hastaMes);
      let totalDiasHabiles = 0;
      const current = new Date(start);
      while (current <= end) {
        const dia = current.getDay();
        if (dia >= 1 && dia <= 5) totalDiasHabiles++;
        current.setDate(current.getDate() + 1);
      }
      const diasConRegistro = new Set(regs.map((a) => a.fecha)).size;
      const tardanzas = regs.filter((a) => a.horaEntrada && a.horaEntrada > '08:00').length;

      return {
        personalId: p.id,
        nombres: p.nombres,
        apellidos: p.apellidos,
        totalHorasNormales: +totalHN.toFixed(2),
        totalHorasExtras: +totalHE.toFixed(2),
        totalDiasTrabajados: diasConRegistro,
        diasFaltantes: totalDiasHabiles - diasConRegistro,
        tardanzas,
      };
    });
  }, [personalEmpresa, asistenciasMes, empresaActivaId]);

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

  const handleExportarBoletas = () => {
    if (personalEmpresa.length === 0) {
      toast.error('No hay personal en esta empresa');
      return;
    }
    exportarDatosPago(empresaActiva, personalEmpresa, resumenMes, mes);
    toast.success('Datos de pago exportados');
  };

  const handleExportarAsistencia = () => {
    if (personalEmpresa.length === 0) {
      toast.error('No hay personal en esta empresa');
      return;
    }
    exportarAsistenciaPeriodo(empresaActiva, personalEmpresa, asistenciasMes, desdeMes, hastaMes);
    toast.success('Reporte de asistencia exportado');
  };

  const handleExportarDirectorio = () => {
    if (personalEmpresa.length === 0) {
      toast.error('No hay personal en esta empresa');
      return;
    }
    exportarDirectorioPersonal(empresaActiva, personalEmpresa);
    toast.success('Directorio exportado');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building size={16} className="text-blue-200" />
              <span className="text-sm text-blue-200">{empresaActiva.nombre}</span>
            </div>
            <h1 className="text-xl font-bold">Reportes RR.HH.</h1>
          </div>
          <select
            value={empresaActivaId || ''}
            onChange={(e) => setEmpresaActiva(e.target.value)}
            className="bg-white/20 text-white text-sm rounded-lg px-3 py-2 border border-white/30 outline-none"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id} className="text-gray-900">{e.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm p-1">
        {([
          { id: 'boletas', label: 'Boletas de Pago' },
          { id: 'asistencia', label: 'Reporte Asistencia' },
          { id: 'directorio', label: 'Directorio' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'boletas' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Exportar Datos para Boletas de Pago</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">El Excel incluirá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Datos personales de cada colaborador</li>
                <li>Sueldo base, días trabajados y horas extras</li>
                <li>Datos bancarios para pago (cuenta 1 y 2)</li>
              </ul>
            </div>
            <button
              onClick={handleExportarBoletas}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Exportar Boletas de Pago
            </button>
          </div>

          {resumenMes.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Vista previa del período</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Colaborador</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Días</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">HN</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">HE</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Faltas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {resumenMes.map((r) => (
                      <tr key={r.personalId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{r.nombres} {r.apellidos}</td>
                        <td className="px-3 py-2 text-center text-sm">{r.totalDiasTrabajados}</td>
                        <td className="px-3 py-2 text-center text-sm">{r.totalHorasNormales}</td>
                        <td className="px-3 py-2 text-center text-sm text-orange-600">{r.totalHorasExtras}</td>
                        <td className="px-3 py-2 text-center text-sm text-red-600">{r.diasFaltantes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'asistencia' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Exportar Reporte de Asistencia</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">El Excel incluirá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Resumen por colaborador del mes seleccionado</li>
                <li>Horas normales y horas extras</li>
                <li>Días trabajados</li>
                <li>Totales generales</li>
              </ul>
            </div>
            <button
              onClick={handleExportarAsistencia}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Exportar Asistencia ({mes})
            </button>
          </div>
        </div>
      )}

      {tab === 'directorio' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Exportar Directorio de Personal</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <FileSpreadsheet size={18} className="text-blue-500" />
              <span><strong>{personalEmpresa.length}</strong> colaborador(es) en {empresaActiva.nombre}</span>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">El Excel incluirá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Datos personales completos (DNI, nombres, cargo, contrato)</li>
                <li>Datos bancarios (cuenta 1 y 2 con banco y tipo)</li>
                <li>Sueldo base</li>
              </ul>
            </div>
            <button
              onClick={handleExportarDirectorio}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Exportar Directorio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

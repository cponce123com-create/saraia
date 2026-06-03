import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit3, Trash2, Search, Building, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import useHRStore from '../store/hrStore';
import PersonalModal from '../components/PersonalModal';
import type { Personal as PersonalType, EstadoPersonal } from '../types';

const ESTADO_COLORS: Record<EstadoPersonal, string> = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-600',
  vacaciones: 'bg-blue-100 text-blue-700',
  licencia: 'bg-yellow-100 text-yellow-700',
};

export default function Personal() {
  const navigate = useNavigate();
  const { empresas, empresaActivaId, getPersonalDeEmpresa, agregarPersonal, editarPersonal, eliminarPersonal, setEmpresaActiva } = useHRStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<PersonalType | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPersonal | 'todos'>('todos');

  const empresaActiva = empresas.find((e) => e.id === empresaActivaId);

  // Redirigir si no hay empresa activa
  useEffect(() => {
    if (empresas.length > 0 && !empresaActivaId) {
      navigate('/empresas');
    }
  }, [empresaActivaId, empresas.length, navigate]);

  const personalEmpresa = empresaActivaId ? getPersonalDeEmpresa(empresaActivaId) : [];
  const existingDnis = personalEmpresa.map((p) => p.dni);

  const filtrados = useMemo(() => {
    return personalEmpresa.filter((p) => {
      const matchBusqueda = !busqueda || 
        p.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.dni.includes(busqueda);
      const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [personalEmpresa, busqueda, filtroEstado]);

  const handleSave = (data: Omit<PersonalType, 'id' | 'createdAt'>) => {
    if (editando) {
      editarPersonal(editando.id, data);
      toast.success('Colaborador actualizado');
    } else {
      agregarPersonal(data);
      toast.success('Colaborador agregado');
    }
    setEditando(null);
  };

  const handleDelete = (id: number) => {
    eliminarPersonal(id);
    toast.success('Colaborador eliminado');
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
            <h1 className="text-xl font-bold">Personal</h1>
            <p className="text-blue-100 text-sm mt-0.5">{personalEmpresa.length} colaborador(es)</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={empresaActivaId || ''}
              onChange={(e) => setEmpresaActiva(e.target.value)}
              className="bg-white/20 text-white text-sm rounded-lg px-3 py-2 border border-white/30 outline-none"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id} className="text-gray-900">{e.nombre}</option>
              ))}
            </select>
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          {(['todos', 'activo', 'inactivo', 'vacaciones', 'licencia'] as const).map((est) => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filtroEstado === est
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {est === 'todos' ? 'Todos' : est.charAt(0).toUpperCase() + est.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users size={48} className="mb-4" />
          <p className="text-lg font-medium">No hay colaboradores</p>
          <p className="text-sm mt-1">Agrega tu primer colaborador</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">DNI</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombres</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Cargo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Contrato</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">{p.dni}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.nombres} {p.apellidos}</p>
                    <p className="text-xs text-gray-400 md:hidden">{p.cargo || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{p.cargo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{p.tipoContrato}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COLORS[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditando(p); setModalOpen(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PersonalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        onSave={handleSave}
        initial={editando}
        empresaId={empresaActivaId!}
        existingDnis={existingDnis}
      />
    </div>
  );
}

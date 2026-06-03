import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Edit3, Trash2, Users, X, AlertTriangle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import useHRStore from '../store/hrStore';

const COLORES = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#475569'];

export default function Empresas() {
  const navigate = useNavigate();
  const { empresas, personal, agregarEmpresa, editarEmpresa, eliminarEmpresa, setEmpresaActiva, cargarDatosDemo } = useHRStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [ruc, setRuc] = useState('');
  const [color, setColor] = useState(COLORES[0]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const resetForm = () => {
    setNombre('');
    setRuc('');
    setColor(COLORES[0]);
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (id: number) => {
    const e = empresas.find((emp) => emp.id === id);
    if (!e) return;
    setNombre(e.nombre);
    setRuc(e.ruc);
    setColor(e.color);
    setEditId(id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      toast.error('El nombre de la empresa es requerido');
      return;
    }
    if (editId) {
      editarEmpresa(editId, { nombre: nombre.trim(), ruc, color });
      toast.success('Empresa actualizada');
    } else {
      agregarEmpresa({ nombre: nombre.trim(), ruc, color });
      toast.success('Empresa creada');
    }
    resetForm();
  };

  const handleDelete = (id: number) => {
    const tienePersonal = personal.some((p) => p.empresaId === id);
    if (tienePersonal) {
      const count = personal.filter((p) => p.empresaId === id).length;
      if (!confirmDelete) {
        setConfirmDelete(id);
        return;
      }
      if (confirmDelete === id) {
        eliminarEmpresa(id);
        toast.success(`Empresa eliminada con ${count} colaborador(es)`);
        setConfirmDelete(null);
      }
    } else {
      eliminarEmpresa(id);
      toast.success('Empresa eliminada');
    }
  };

  const handleSelect = (id: string) => {
    setEmpresaActiva(id);
    navigate('/personal');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Empresas</h1>
            <p className="text-blue-100 text-sm mt-1">Gestiona tus razones sociales</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            Nueva
          </button>
        </div>
      </div>

      {empresas.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Building size={48} className="mb-4" />
          <p className="text-lg font-medium">No hay empresas registradas</p>
          <p className="text-sm mt-1">Crea tu primera empresa para comenzar</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Crear primera empresa
          </button>
          <button
            onClick={() => { cargarDatosDemo(); toast.success('Datos demo cargados'); }}
            className="mt-3 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Sparkles size={18} />
            Cargar datos demo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((emp) => {
            const cantidadPersonal = personal.filter((p) => p.empresaId === emp.id).length;
            return (
              <div
                key={emp.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelect(emp.id)}
              >
                <div className="h-2" style={{ backgroundColor: emp.color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: emp.color + '20' }}>
                        <Building size={20} style={{ color: emp.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{emp.nombre}</h3>
                        <p className="text-xs text-gray-500">RUC: {emp.ruc || '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Users size={16} />
                    <span>{cantidadPersonal} colaborador(es)</span>
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(emp.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {confirmDelete === emp.id ? <AlertTriangle size={14} className="text-red-500" /> : <Trash2 size={14} />}
                      {confirmDelete === emp.id ? 'Confirmar' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{editId ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la empresa *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Mi Empresa S.A.C."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RUC</label>
                <input
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="20600000000"
                  maxLength={11}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                {editId ? 'Guardar cambios' : 'Crear empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

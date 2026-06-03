import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Personal, TipoBanco, TipoCuenta, TipoContrato, EstadoPersonal } from '../types';

interface PersonalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Personal, 'id' | 'createdAt'>) => void;
  initial?: Personal | null;
  empresaId: string;
  existingDnis: string[];
}

const BANCOS: TipoBanco[] = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'BanBif', 'Pichincha', 'Nacion', 'Otro'];
const TIPOS_CUENTA: TipoCuenta[] = ['ahorro', 'corriente', 'CTS', 'interbancario'];
const CONTRATOS: TipoContrato[] = ['planilla', 'recibo_honorarios', 'CAS', 'practicante', 'otro'];
const ESTADOS: EstadoPersonal[] = ['activo', 'inactivo', 'vacaciones', 'licencia'];

interface FormData {
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  correo: string;
  cargo: string;
  tipoContrato: TipoContrato;
  estado: EstadoPersonal;
  banco1: string;
  numeroCuenta1: string;
  tipoCuenta1: string;
  banco2: string;
  numeroCuenta2: string;
  tipoCuenta2: string;
  sueldoBase: string;
}

const INITIAL_FORM: FormData = {
  dni: '', nombres: '', apellidos: '', celular: '', correo: '', cargo: '',
  tipoContrato: 'planilla', estado: 'activo',
  banco1: '', numeroCuenta1: '', tipoCuenta1: '',
  banco2: '', numeroCuenta2: '', tipoCuenta2: '',
  sueldoBase: '',
};

export default function PersonalModal({ open, onClose, onSave, initial, empresaId, existingDnis }: PersonalModalProps) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        dni: initial.dni,
        nombres: initial.nombres,
        apellidos: initial.apellidos,
        celular: initial.celular || '',
        correo: initial.correo || '',
        cargo: initial.cargo || '',
        tipoContrato: initial.tipoContrato,
        estado: initial.estado,
        banco1: initial.banco1 || '',
        numeroCuenta1: initial.numeroCuenta1 || '',
        tipoCuenta1: initial.tipoCuenta1 || '',
        banco2: initial.banco2 || '',
        numeroCuenta2: initial.numeroCuenta2 || '',
        tipoCuenta2: initial.tipoCuenta2 || '',
        sueldoBase: initial.sueldoBase != null ? String(initial.sueldoBase) : '',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setError(null);
  }, [initial, open]);

  if (!open) return null;

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  };

  const handleSave = () => {
    // Validaciones
    if (!form.dni || form.dni.length !== 8 || !/^\d{8}$/.test(form.dni)) {
      setError('DNI debe tener exactamente 8 dígitos');
      return;
    }
    if (!form.nombres.trim()) {
      setError('Nombres es requerido');
      return;
    }
    if (!form.apellidos.trim()) {
      setError('Apellidos es requerido');
      return;
    }
    // Validar DNI duplicado
    const dnisFiltrados = initial ? existingDnis.filter((d) => d !== initial.dni) : existingDnis;
    if (dnisFiltrados.includes(form.dni)) {
      setError('Ya existe un colaborador con este DNI en la empresa');
      return;
    }

    onSave({
      empresaId,
      dni: form.dni,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      celular: form.celular || null,
      correo: form.correo || null,
      cargo: form.cargo || null,
      tipoContrato: form.tipoContrato,
      estado: form.estado,
      banco1: (form.banco1 || null) as TipoBanco | null,
      numeroCuenta1: form.numeroCuenta1 || null,
      tipoCuenta1: (form.tipoCuenta1 || null) as TipoCuenta | null,
      banco2: (form.banco2 || null) as TipoBanco | null,
      numeroCuenta2: form.numeroCuenta2 || null,
      tipoCuenta2: (form.tipoCuenta2 || null) as TipoCuenta | null,
      sueldoBase: form.sueldoBase ? parseFloat(form.sueldoBase) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{initial ? 'Editar Colaborador' : 'Nuevo Colaborador'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* DATOS PERSONALES */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos Personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">DNI *</label>
                <input
                  value={form.dni}
                  onChange={(e) => handleChange('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Sueldo Base (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.sueldoBase}
                  onChange={(e) => handleChange('sueldoBase', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombres *</label>
                <input
                  value={form.nombres}
                  onChange={(e) => handleChange('nombres', e.target.value)}
                  placeholder="Nombres completos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos *</label>
                <input
                  value={form.apellidos}
                  onChange={(e) => handleChange('apellidos', e.target.value)}
                  placeholder="Apellidos completos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                <input
                  value={form.celular}
                  onChange={(e) => handleChange('celular', e.target.value)}
                  placeholder="999 999 999"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => handleChange('correo', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
                <input
                  value={form.cargo}
                  onChange={(e) => handleChange('cargo', e.target.value)}
                  placeholder="Ej: Asistente"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Contrato</label>
                <select
                  value={form.tipoContrato}
                  onChange={(e) => handleChange('tipoContrato', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {CONTRATOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DATOS BANCARIOS — Cuenta 1 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos Bancarios — Cuenta 1</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                <select
                  value={form.banco1}
                  onChange={(e) => handleChange('banco1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Seleccionar</option>
                  {BANCOS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">N° Cuenta</label>
                <input
                  value={form.numeroCuenta1}
                  onChange={(e) => handleChange('numeroCuenta1', e.target.value)}
                  placeholder="0000-0000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.tipoCuenta1}
                  onChange={(e) => handleChange('tipoCuenta1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Seleccionar</option>
                  {TIPOS_CUENTA.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DATOS BANCARIOS — Cuenta 2 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos Bancarios — Cuenta 2 (opcional)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                <select
                  value={form.banco2}
                  onChange={(e) => handleChange('banco2', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Seleccionar</option>
                  {BANCOS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">N° Cuenta</label>
                <input
                  value={form.numeroCuenta2}
                  onChange={(e) => handleChange('numeroCuenta2', e.target.value)}
                  placeholder="0000-0000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={form.tipoCuenta2}
                  onChange={(e) => handleChange('tipoCuenta2', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Seleccionar</option>
                  {TIPOS_CUENTA.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
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
            {initial ? 'Guardar cambios' : 'Agregar colaborador'}
          </button>
        </div>
      </div>
    </div>
  );
}

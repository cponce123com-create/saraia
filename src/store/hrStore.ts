import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  HRStore, Empresa, Personal, RegistroAsistencia, ResumenSemanalPersonal,
  TipoContrato, EstadoPersonal, TipoBanco, TipoCuenta, TipoHoraExtra,
} from '../types';
import type { EmpresaResponse, PersonalResponse, AsistenciaResponse } from '../lib/api';

const JORNADA_MINUTOS = 480; // 8 horas

// ─── Helpers ───────────────────────────────────────────────────────

function calcularHoras(entrada: string | null, salida: string | null): { normales: number; extras: number } {
  if (!entrada || !salida) return { normales: 0, extras: 0 };
  const [he, me] = entrada.split(':').map(Number);
  const [hs, ms] = salida.split(':').map(Number);
  const totalMin = (hs * 60 + ms) - (he * 60 + me);
  if (totalMin <= 0) return { normales: 0, extras: 0 };
  if (totalMin <= JORNADA_MINUTOS) return { normales: +(totalMin / 60).toFixed(2), extras: 0 };
  return {
    normales: +(JORNADA_MINUTOS / 60).toFixed(2),
    extras: +((totalMin - JORNADA_MINUTOS) / 60).toFixed(2),
  };
}

function mapEmpresa(r: EmpresaResponse): Empresa {
  return {
    id: r.id,
    nombre: r.nombre,
    ruc: r.ruc,
    color: r.color,
    createdAt: r.created_at,
  };
}

function mapPersonal(r: PersonalResponse): Personal {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    dni: r.dni,
    nombres: r.nombres,
    apellidos: r.apellidos,
    celular: r.celular,
    correo: r.correo,
    cargo: r.cargo,
    tipoContrato: r.tipo_contrato as TipoContrato,
    estado: r.estado as EstadoPersonal,
    banco1: r.banco1 as TipoBanco | null,
    numeroCuenta1: r.cuenta1,
    tipoCuenta1: r.tipo_cuenta1 as TipoCuenta | null,
    banco2: r.banco2 as TipoBanco | null,
    numeroCuenta2: r.cuenta2,
    tipoCuenta2: r.tipo_cuenta2 as TipoCuenta | null,
    sueldoBase: r.sueldo_base !== null ? Number(r.sueldo_base) : null,
    createdAt: r.created_at,
  };
}

function mapAsistencia(r: AsistenciaResponse): RegistroAsistencia {
  return {
    id: r.id,
    personalId: r.personal_id,
    empresaId: r.empresa_id,
    fecha: r.fecha,
    horaEntrada: r.hora_entrada,
    horaSalida: r.hora_salida,
    horasNormales: Number(r.horas_normales),
    horasExtras: Number(r.horas_extras),
    tipoHoraExtra: r.tipo_hora_extra as TipoHoraExtra | null,
    observacion: r.observacion,
  };
}

// ─── Store ─────────────────────────────────────────────────────────

const useHRStore = create<HRStore>()((set, get) => ({
  empresas: [],
  personal: [],
  asistencias: [],
  empresaActivaId: null,
  loading: false,
  error: null,

  // ─── Empresas ────────────────────────────────────────────────

  cargarEmpresas: async () => {
    set({ loading: true, error: null });
    try {
      const empresas = await api.empresas.list();
      const mapped = empresas.map(mapEmpresa);
      set({
        empresas: mapped,
        empresaActivaId: mapped.length > 0 ? mapped[0].id : null,
        loading: false,
      });
      // Cargar personal de la empresa activa
      if (mapped.length > 0) {
        get().cargarPersonal(mapped[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar empresas';
      set({ error: msg, loading: false });
    }
  },

  agregarEmpresa: async (data): Promise<Empresa> => {
    try {
      const empresa = await api.empresas.create({
        nombre: data.nombre,
        ruc: data.ruc,
        color: data.color,
      });
      const mapped = mapEmpresa(empresa);
      set((s) => ({ empresas: [...s.empresas, mapped] }));
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear empresa';
      set({ error: msg });
      throw err;
    }
  },

  editarEmpresa: async (id, data) => {
    try {
      await api.empresas.update(id, {
        nombre: data.nombre,
        ruc: data.ruc,
        color: data.color,
      });
      set((s) => ({
        empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...data } : e)),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al editar empresa';
      set({ error: msg });
    }
  },

  eliminarEmpresa: async (id) => {
    try {
      await api.empresas.delete(id);
      set((s) => ({
        empresas: s.empresas.filter((e) => e.id !== id),
        personal: s.personal.filter((p) => p.empresaId !== id),
        asistencias: s.asistencias.filter((a) => a.empresaId !== id),
        empresaActivaId: s.empresaActivaId === id ? null : s.empresaActivaId,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar empresa';
      set({ error: msg });
    }
  },

  setEmpresaActiva: (id) => {
    set({ empresaActivaId: id });
    if (id) get().cargarPersonal(id);
  },

  // ─── Personal ────────────────────────────────────────────────

  cargarPersonal: async (empresaId?: string) => {
    try {
      const params = empresaId ? { empresa_id: empresaId } : undefined;
      const personal = await api.personal.list(params);
      set({ personal: personal.map(mapPersonal) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar personal';
      set({ error: msg });
    }
  },

  agregarPersonal: async (data): Promise<Personal> => {
    try {
      const persona = await api.personal.create({
        empresa_id: data.empresaId,
        dni: data.dni,
        nombres: data.nombres,
        apellidos: data.apellidos,
        celular: data.celular,
        correo: data.correo,
        cargo: data.cargo,
        tipo_contrato: data.tipoContrato,
        estado: data.estado,
        banco1: data.banco1,
        cuenta1: data.numeroCuenta1,
        tipo_cuenta1: data.tipoCuenta1,
        banco2: data.banco2,
        cuenta2: data.numeroCuenta2,
        tipo_cuenta2: data.tipoCuenta2,
        sueldo_base: data.sueldoBase,
      });
      const mapped = mapPersonal(persona);
      set((s) => ({ personal: [...s.personal, mapped] }));
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear personal';
      set({ error: msg });
      throw err;
    }
  },

  editarPersonal: async (id, data) => {
    try {
      await api.personal.update(id, {
        dni: data.dni,
        nombres: data.nombres,
        apellidos: data.apellidos,
        celular: data.celular,
        correo: data.correo,
        cargo: data.cargo,
        tipo_contrato: data.tipoContrato,
        estado: data.estado,
        banco1: data.banco1,
        cuenta1: data.numeroCuenta1,
        tipo_cuenta1: data.tipoCuenta1,
        banco2: data.banco2,
        cuenta2: data.numeroCuenta2,
        tipo_cuenta2: data.tipoCuenta2,
        sueldo_base: data.sueldoBase,
      });
      set((s) => ({
        personal: s.personal.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al editar personal';
      set({ error: msg });
    }
  },

  eliminarPersonal: async (id) => {
    try {
      await api.personal.delete(id);
      set((s) => ({
        personal: s.personal.filter((p) => p.id !== id),
        asistencias: s.asistencias.filter((a) => a.personalId !== id),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar personal';
      set({ error: msg });
    }
  },

  getPersonalDeEmpresa: (empresaId) => {
    return get().personal.filter((p) => p.empresaId === empresaId);
  },

  // ─── Asistencias ─────────────────────────────────────────────

  cargarAsistencias: async (params?) => {
    try {
      const asistencias = await api.asistencias.list({
        empresa_id: params?.empresaId,
        personal_id: params?.personalId,
        desde: params?.desde,
        hasta: params?.hasta,
      });
      set({ asistencias: asistencias.map(mapAsistencia) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar asistencias';
      set({ error: msg });
    }
  },

  registrarAsistencia: async (data): Promise<RegistroAsistencia> => {
    try {
      const { normales, extras } = calcularHoras(data.horaEntrada, data.horaSalida);
      const asistencia = await api.asistencias.create({
        personal_id: data.personalId,
        empresa_id: data.empresaId,
        fecha: data.fecha,
        hora_entrada: data.horaEntrada || undefined,
        hora_salida: data.horaSalida || undefined,
        tipo_hora_extra: data.tipoHoraExtra || undefined,
        observacion: data.observacion || undefined,
      });
      const mapped = {
        ...mapAsistencia(asistencia),
        horasNormales: normales,
        horasExtras: extras,
      };
      set((s) => ({ asistencias: [...s.asistencias, mapped] }));
      return mapped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar asistencia';
      set({ error: msg });
      throw err;
    }
  },

  editarAsistencia: async (id, data) => {
    try {
      const state = get();
      const existente = state.asistencias.find((a) => a.id === id);
      if (!existente) return;

      await api.asistencias.update(id, {
        hora_entrada: data.horaEntrada || undefined,
        hora_salida: data.horaSalida || undefined,
        tipo_hora_extra: data.tipoHoraExtra || undefined,
        observacion: data.observacion || undefined,
      });

      const merged = { ...existente, ...data };
      if (data.horaEntrada !== undefined || data.horaSalida !== undefined) {
        const { normales, extras } = calcularHoras(merged.horaEntrada, merged.horaSalida);
        merged.horasNormales = normales;
        merged.horasExtras = extras;
      }

      set((s) => ({
        asistencias: s.asistencias.map((a) => (a.id === id ? merged : a)),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al editar asistencia';
      set({ error: msg });
    }
  },

  eliminarAsistencia: async (id) => {
    try {
      await api.asistencias.delete(id);
      set((s) => ({
        asistencias: s.asistencias.filter((a) => a.id !== id),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar asistencia';
      set({ error: msg });
    }
  },

  getAsistenciasPorPeriodo: (empresaId, desde, hasta) => {
    return get().asistencias.filter(
      (a) => a.empresaId === empresaId && a.fecha >= desde && a.fecha <= hasta,
    );
  },

  calcularResumenPeriodo: (empresaId, desde, hasta): ResumenSemanalPersonal[] => {
    const state = get();
    const personalEmpresa = state.personal.filter((p) => p.empresaId === empresaId);
    const asistenciasPeriodo = state.asistencias.filter(
      (a) => a.empresaId === empresaId && a.fecha >= desde && a.fecha <= hasta,
    );

    return personalEmpresa.map((persona) => {
      const regs = asistenciasPeriodo.filter((a) => a.personalId === persona.id);
      const totalHN = regs.reduce((s, a) => s + a.horasNormales, 0);
      const totalHE = regs.reduce((s, a) => s + a.horasExtras, 0);
      const diasConRegistro = new Set(regs.map((a) => a.fecha)).size;
      const tardanzas = regs.filter((a) => a.horaEntrada && a.horaEntrada > '08:00').length;

      const start = new Date(desde);
      const end = new Date(hasta);
      let totalDiasHabiles = 0;
      const current = new Date(start);
      while (current <= end) {
        const dia = current.getDay();
        if (dia >= 1 && dia <= 5) totalDiasHabiles++;
        current.setDate(current.getDate() + 1);
      }

      return {
        personalId: 0, // Se mantiene por compatibilidad de tipo
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        totalHorasNormales: +totalHN.toFixed(2),
        totalHorasExtras: +totalHE.toFixed(2),
        totalDiasTrabajados: diasConRegistro,
        diasFaltantes: totalDiasHabiles - diasConRegistro,
        tardanzas,
      };
    });
  },

  cargarDatosDemo: async () => {
    // Verificar si ya hay empresas
    try {
      const empresas = await api.empresas.list();
      if (empresas.length > 0) {
        // Ya hay datos, solo cargarlos
        set({ empresas: empresas.map(mapEmpresa) });
        return;
      }
    } catch {
      // Si falla, probablemente no hay conexión a la DB
    }

    // Crear empresas demo
    try {
      const emp1 = await api.empresas.create({
        nombre: 'Transportes R\u00e1pidos S.A.C.',
        ruc: '20123456789',
        color: '#2563eb',
      });
      const emp2 = await api.empresas.create({
        nombre: 'Inversiones del Sur E.I.R.L.',
        ruc: '20987654321',
        color: '#059669',
      });

      const p1 = await api.personal.create({ empresa_id: emp1.id, dni: '45123456', nombres: 'Ana Mar\u00eda', apellidos: 'Garc\u00eda L\u00f3pez', celular: '999111222', correo: 'ana.garcia@email.com', cargo: 'Asistente Administrativa', tipo_contrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '19123456789012', tipo_cuenta1: 'ahorro', sueldo_base: 1500 });
      const p2 = await api.personal.create({ empresa_id: emp1.id, dni: '46234567', nombres: 'Carlos Miguel', apellidos: 'P\u00e9rez Castro', celular: '999333444', correo: 'carlos.perez@email.com', cargo: 'Chofer', tipo_contrato: 'planilla', estado: 'activo', banco1: 'Interbank', cuenta1: '098765432109', tipo_cuenta1: 'corriente', banco2: 'BBVA', cuenta2: '00123456789012345678', tipo_cuenta2: 'CTS', sueldo_base: 1800 });
      const p3 = await api.personal.create({ empresa_id: emp1.id, dni: '47345678', nombres: 'Rosa Elena', apellidos: 'Mendoza Torres', celular: '999555666', correo: 'rosa.mendoza@email.com', cargo: 'Supervisora de Operaciones', tipo_contrato: 'CAS', estado: 'activo', banco1: 'Scotiabank', cuenta1: '123456789012', tipo_cuenta1: 'ahorro', sueldo_base: 2500 });
      const p4 = await api.personal.create({ empresa_id: emp2.id, dni: '48456789', nombres: 'Pedro Antonio', apellidos: 'Ram\u00edrez Silva', celular: '999777888', correo: 'pedro.ramirez@email.com', cargo: 'Contador', tipo_contrato: 'recibo_honorarios', estado: 'activo', banco1: 'BCP', cuenta1: '123987654321', tipo_cuenta1: 'corriente', banco2: 'Nacion', cuenta2: '987654321098', tipo_cuenta2: 'interbancario', sueldo_base: 3200 });
      const p5 = await api.personal.create({ empresa_id: emp2.id, dni: '49567890', nombres: 'Luc\u00eda Fernanda', apellidos: 'Huam\u00e1n Paredes', celular: '999000111', correo: 'lucia.huaman@email.com', cargo: 'Asistente de Ventas', tipo_contrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '00123456789012345679', tipo_cuenta1: 'ahorro', sueldo_base: 1300 });
      await api.personal.create({ empresa_id: emp2.id, dni: '50678901', nombres: 'Jorge Luis', apellidos: 'Quispe Vargas', celular: '999222333', correo: 'jorge.quispe@email.com', cargo: 'Almacenero', tipo_contrato: 'CAS', estado: 'inactivo', banco1: 'Pichincha', cuenta1: '234567890123', tipo_cuenta1: 'ahorro', sueldo_base: 1100 });

      // Asistencias demo
      const hoy = new Date();
      const diaSem = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSem === 0 ? 6 : diaSem - 1));

      const horarios: [string, string][] = [
        ['08:00', '17:00'],
        ['08:15', '18:30'],
        ['07:50', '16:30'],
        ['09:00', '18:00'],
        ['08:30', '17:30'],
      ];

      const personalIds = [p1, p2, p3, p4, p5];
      for (let d = 0; d < 5; d++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + d);
        const fechaStr = fecha.toISOString().split('T')[0];
        for (let idx = 0; idx < personalIds.length; idx++) {
          if (d === 0 && idx === 4) continue;
          if (d === 3 && idx === 0) continue;
          const [entrada, salida] = horarios[(idx + d) % horarios.length];
          await api.asistencias.create({
            personal_id: personalIds[idx].id,
            empresa_id: personalIds[idx].empresa_id,
            fecha: fechaStr,
            hora_entrada: entrada,
            hora_salida: salida,
          });
        }
      }

      // Recargar todo
      set({
        empresas: [mapEmpresa(emp1), mapEmpresa(emp2)],
        empresaActivaId: emp1.id,
      });
      await get().cargarPersonal(emp1.id);
    } catch (err) {
      console.error('[hrStore] Error cargando datos demo:', err);
    }
  },
}));

export default useHRStore;

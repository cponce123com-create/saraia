import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  HRStore, Empresa, Personal, RegistroAsistencia, ResumenSemanalPersonal,
  TipoContrato, EstadoPersonal, TipoBanco, TipoCuenta, TipoHoraExtra,
} from '../types';
import type { EmpresaRow, PersonalRow, AsistenciaRow } from '../types';

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

function mapEmpresaRow(r: EmpresaRow): Empresa {
  return {
    id: r.id,
    nombre: r.nombre,
    ruc: r.ruc,
    color: r.color,
    createdAt: r.created_at,
  };
}

function mapPersonalRow(r: PersonalRow): Personal {
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

function mapAsistenciaRow(r: AsistenciaRow): RegistroAsistencia {
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
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) throw new Error(error.message);

      const mapped = (data || []).map(mapEmpresaRow);
      set({
        empresas: mapped,
        empresaActivaId: mapped.length > 0 ? mapped[0].id : null,
        loading: false,
      });
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
      const { data: result, error } = await supabase
        .from('empresas')
        .insert({ nombre: data.nombre, ruc: data.ruc, color: data.color })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!result) throw new Error('No se pudo crear la empresa');

      const mapped = mapEmpresaRow(result as EmpresaRow);
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
      const updates: Record<string, string | undefined> = {};
      if (data.nombre !== undefined) updates.nombre = data.nombre;
      if (data.ruc !== undefined) updates.ruc = data.ruc;
      if (data.color !== undefined) updates.color = data.color;

      const { error } = await supabase.from('empresas').update(updates).eq('id', id);
      if (error) throw new Error(error.message);

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
      const { error } = await supabase.from('empresas').delete().eq('id', id);
      if (error) throw new Error(error.message);

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
      let query = supabase.from('personal').select('*');
      if (empresaId) query = query.eq('empresa_id', empresaId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      set({ personal: (data || []).map(mapPersonalRow) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar personal';
      set({ error: msg });
    }
  },

  agregarPersonal: async (data): Promise<Personal> => {
    try {
      const { data: result, error } = await supabase
        .from('personal')
        .insert({
          empresa_id: data.empresaId,
          dni: data.dni,
          nombres: data.nombres,
          apellidos: data.apellidos,
          celular: data.celular || null,
          correo: data.correo || null,
          cargo: data.cargo || null,
          tipo_contrato: data.tipoContrato,
          estado: data.estado,
          banco1: data.banco1 || null,
          cuenta1: data.numeroCuenta1 || null,
          tipo_cuenta1: data.tipoCuenta1 || null,
          banco2: data.banco2 || null,
          cuenta2: data.numeroCuenta2 || null,
          tipo_cuenta2: data.tipoCuenta2 || null,
          sueldo_base: data.sueldoBase || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!result) throw new Error('No se pudo crear el personal');

      const mapped = mapPersonalRow(result as PersonalRow);
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
      const updates: Record<string, unknown> = {};
      if (data.dni !== undefined) updates.dni = data.dni;
      if (data.nombres !== undefined) updates.nombres = data.nombres;
      if (data.apellidos !== undefined) updates.apellidos = data.apellidos;
      if (data.celular !== undefined) updates.celular = data.celular;
      if (data.correo !== undefined) updates.correo = data.correo;
      if (data.cargo !== undefined) updates.cargo = data.cargo;
      if (data.tipoContrato !== undefined) updates.tipo_contrato = data.tipoContrato;
      if (data.estado !== undefined) updates.estado = data.estado;
      if (data.banco1 !== undefined) updates.banco1 = data.banco1;
      if (data.numeroCuenta1 !== undefined) updates.cuenta1 = data.numeroCuenta1;
      if (data.tipoCuenta1 !== undefined) updates.tipo_cuenta1 = data.tipoCuenta1;
      if (data.banco2 !== undefined) updates.banco2 = data.banco2;
      if (data.numeroCuenta2 !== undefined) updates.cuenta2 = data.numeroCuenta2;
      if (data.tipoCuenta2 !== undefined) updates.tipo_cuenta2 = data.tipoCuenta2;
      if (data.sueldoBase !== undefined) updates.sueldo_base = data.sueldoBase;

      const { error } = await supabase.from('personal').update(updates).eq('id', id);
      if (error) throw new Error(error.message);

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
      const { error } = await supabase.from('personal').delete().eq('id', id);
      if (error) throw new Error(error.message);

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
      let query = supabase.from('asistencias').select('*');

      if (params?.empresaId) query = query.eq('empresa_id', params.empresaId);
      if (params?.personalId) query = query.eq('personal_id', params.personalId);
      if (params?.desde) query = query.gte('fecha', params.desde);
      if (params?.hasta) query = query.lte('fecha', params.hasta);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      set({ asistencias: (data || []).map(mapAsistenciaRow) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar asistencias';
      set({ error: msg });
    }
  },

  registrarAsistencia: async (data): Promise<RegistroAsistencia> => {
    try {
      const { normales, extras } = calcularHoras(data.horaEntrada, data.horaSalida);

      const { data: result, error } = await supabase
        .from('asistencias')
        .insert({
          personal_id: data.personalId,
          empresa_id: data.empresaId,
          fecha: data.fecha,
          hora_entrada: data.horaEntrada || null,
          hora_salida: data.horaSalida || null,
          tipo_hora_extra: data.tipoHoraExtra || null,
          observacion: data.observacion || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!result) throw new Error('No se pudo registrar la asistencia');

      const mapped = {
        ...mapAsistenciaRow(result as AsistenciaRow),
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

      const updates: Record<string, unknown> = {};
      if (data.horaEntrada !== undefined) updates.hora_entrada = data.horaEntrada;
      if (data.horaSalida !== undefined) updates.hora_salida = data.horaSalida;
      if (data.tipoHoraExtra !== undefined) updates.tipo_hora_extra = data.tipoHoraExtra;
      if (data.observacion !== undefined) updates.observacion = data.observacion;

      const { error } = await supabase.from('asistencias').update(updates).eq('id', id);
      if (error) throw new Error(error.message);

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
      const { error } = await supabase.from('asistencias').delete().eq('id', id);
      if (error) throw new Error(error.message);

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
        personalId: 0,
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
    try {
      const { data: existingEmpresas } = await supabase.from('empresas').select('id');
      if (existingEmpresas && existingEmpresas.length > 0) {
        // Ya hay datos, cargarlos
        const { data } = await supabase.from('empresas').select('*');
        if (data) set({ empresas: data.map(mapEmpresaRow) });
        return;
      }
    } catch {
      // Si falla, continuar con datos demo
    }

    try {
      const { data: emp1, error: e1 } = await supabase
        .from('empresas')
        .insert({ nombre: 'Transportes Rápidos S.A.C.', ruc: '20123456789', color: '#2563eb' })
        .select()
        .single();

      if (e1) throw new Error(e1.message);

      const { data: emp2, error: e2 } = await supabase
        .from('empresas')
        .insert({ nombre: 'Inversiones del Sur E.I.R.L.', ruc: '20987654321', color: '#059669' })
        .select()
        .single();

      if (e2) throw new Error(e2.message);

      if (!emp1 || !emp2) throw new Error('No se pudieron crear empresas demo');

      const personalData = [
        { empresa_id: emp1.id, dni: '45123456', nombres: 'Ana María', apellidos: 'García López', celular: '999111222', correo: 'ana.garcia@email.com', cargo: 'Asistente Administrativa', tipo_contrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '19123456789012', tipo_cuenta1: 'ahorro', sueldo_base: 1500 },
        { empresa_id: emp1.id, dni: '46234567', nombres: 'Carlos Miguel', apellidos: 'Pérez Castro', celular: '999333444', correo: 'carlos.perez@email.com', cargo: 'Chofer', tipo_contrato: 'planilla', estado: 'activo', banco1: 'Interbank', cuenta1: '098765432109', tipo_cuenta1: 'corriente', banco2: 'BBVA', cuenta2: '00123456789012345678', tipo_cuenta2: 'CTS', sueldo_base: 1800 },
        { empresa_id: emp1.id, dni: '47345678', nombres: 'Rosa Elena', apellidos: 'Mendoza Torres', celular: '999555666', correo: 'rosa.mendoza@email.com', cargo: 'Supervisora de Operaciones', tipo_contrato: 'CAS', estado: 'activo', banco1: 'Scotiabank', cuenta1: '123456789012', tipo_cuenta1: 'ahorro', sueldo_base: 2500 },
        { empresa_id: emp2.id, dni: '48456789', nombres: 'Pedro Antonio', apellidos: 'Ramírez Silva', celular: '999777888', correo: 'pedro.ramirez@email.com', cargo: 'Contador', tipo_contrato: 'recibo_honorarios', estado: 'activo', banco1: 'BCP', cuenta1: '123987654321', tipo_cuenta1: 'corriente', banco2: 'Nacion', cuenta2: '987654321098', tipo_cuenta2: 'interbancario', sueldo_base: 3200 },
        { empresa_id: emp2.id, dni: '49567890', nombres: 'Lucía Fernanda', apellidos: 'Huamán Paredes', celular: '999000111', correo: 'lucia.huaman@email.com', cargo: 'Asistente de Ventas', tipo_contrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '00123456789012345679', tipo_cuenta1: 'ahorro', sueldo_base: 1300 },
        { empresa_id: emp2.id, dni: '50678901', nombres: 'Jorge Luis', apellidos: 'Quispe Vargas', celular: '999222333', correo: 'jorge.quispe@email.com', cargo: 'Almacenero', tipo_contrato: 'CAS', estado: 'inactivo', banco1: 'Pichincha', cuenta1: '234567890123', tipo_cuenta1: 'ahorro', sueldo_base: 1100 },
      ];

      const personalIds: Array<{ id: string; empresa_id: string }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of personalData) {
        const { data: result, error } = await supabase.from('personal').insert(p as any).select('id, empresa_id').single();
        if (!error && result) personalIds.push({ id: result.id, empresa_id: result.empresa_id });
      }

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

      for (let d = 0; d < 5; d++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + d);
        const fechaStr = fecha.toISOString().split('T')[0];
        for (let idx = 0; idx < personalIds.length; idx++) {
          if (d === 0 && idx === 4) continue;
          if (d === 3 && idx === 0) continue;
          const [entrada, salida] = horarios[(idx + d) % horarios.length];
          await supabase.from('asistencias').insert({
            personal_id: personalIds[idx].id,
            empresa_id: personalIds[idx].empresa_id,
            fecha: fechaStr,
            hora_entrada: entrada,
            hora_salida: salida,
          });
        }
      }

      set({
        empresas: [mapEmpresaRow(emp1 as EmpresaRow), mapEmpresaRow(emp2 as EmpresaRow)],
        empresaActivaId: emp1.id,
      });
      await get().cargarPersonal(emp1.id);
    } catch (err) {
      console.error('[hrStore] Error cargando datos demo:', err);
    }
  },
}));

export default useHRStore;

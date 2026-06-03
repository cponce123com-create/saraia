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
      // Verificar sesión activa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesión para cargar datos demo');

      // Verificar si ya hay empresas
      const { data: existing } = await supabase.from('empresas').select('id').limit(1);
      if (existing && existing.length > 0) {
        const { data } = await supabase.from('empresas').select('*');
        if (data) set({ empresas: data.map(mapEmpresaRow) });
        return; // ya hay datos, no duplicar
      }

      // ─── 5 Empresas ──────────────────────────────────────────
      const empresasData = [
        { nombre: 'Constructora Los Andes S.A.C.', ruc: '20123456789', color: '#2563eb' },
        { nombre: 'Transportes Rápidos del Norte E.I.R.L.', ruc: '20987654321', color: '#059669' },
        { nombre: 'Inversiones Costa Verde S.A.', ruc: '20456789123', color: '#d97706' },
        { nombre: 'Grupo Minero Arequipa S.A.C.', ruc: '20789123456', color: '#dc2626' },
        { nombre: 'Servicios Generales Selva S.R.L.', ruc: '20345678901', color: '#7c3aed' },
      ];

      const empresasIds: Array<{ id: string; nombre: string }> = [];
      for (const e of empresasData) {
        const { data, error } = await supabase.from('empresas').insert(e).select('id, nombre').single();
        if (error) console.warn('Error creando empresa:', error.message);
        if (!error && data) empresasIds.push({ id: data.id, nombre: data.nombre });
      }

      if (empresasIds.length === 0) throw new Error('No se pudo crear ninguna empresa. Verifica que estés autenticado.');

      // ─── Vincular perfil del usuario con la primera empresa ──
      const { error: perfilError } = await supabase
        .from('perfiles')
        .update({ empresa_id: empresasIds[0].id, rol: 'gerente' })
        .eq('id', user.id);

      if (perfilError) console.warn('No se pudo actualizar perfil (RLS):', perfilError.message);

      // ─── Personal (26 personas en 5 empresas) ───────────────
      const personalSeed: Array<{
        empresaIdx: number;
        dni: string; nombres: string; apellidos: string;
        celular: string; correo: string; cargo: string;
        tipoContrato: string; estado: string;
        banco1: string; cuenta1: string; tipoCuenta1: string;
        banco2?: string; cuenta2?: string; tipoCuenta2?: string;
        sueldo: number;
      }> = [
        { empresaIdx: 0, dni: '45123456', nombres: 'Ana María', apellidos: 'García López', celular: '999111222', correo: 'ana.garcia@constructora.com', cargo: 'Gerente General', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '19123456789012', tipoCuenta1: 'ahorro', banco2: 'BBVA', cuenta2: '00123456789012345678', tipoCuenta2: 'CTS', sueldo: 8500 },
        { empresaIdx: 0, dni: '46234567', nombres: 'Carlos Miguel', apellidos: 'Pérez Castro', celular: '999333444', correo: 'carlos.perez@constructora.com', cargo: 'Ingeniero Residente', tipoContrato: 'planilla', estado: 'activo', banco1: 'Interbank', cuenta1: '098765432109', tipoCuenta1: 'corriente', sueldo: 6200 },
        { empresaIdx: 0, dni: '47345678', nombres: 'Rosa Elena', apellidos: 'Mendoza Torres', celular: '999555666', correo: 'rosa.mendoza@constructora.com', cargo: 'Supervisora de Obra', tipoContrato: 'CAS', estado: 'activo', banco1: 'Scotiabank', cuenta1: '123456789012', tipoCuenta1: 'ahorro', sueldo: 3800 },
        { empresaIdx: 0, dni: '48456789', nombres: 'Pedro Antonio', apellidos: 'Ramírez Silva', celular: '999777888', correo: 'pedro.ramirez@constructora.com', cargo: 'Asistente Técnico', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '123987654321', tipoCuenta1: 'corriente', sueldo: 2200 },
        { empresaIdx: 0, dni: '49567890', nombres: 'Lucía Fernanda', apellidos: 'Huamán Paredes', celular: '999000111', correo: 'lucia.huaman@constructora.com', cargo: 'Administradora', tipoContrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '00123456789012345679', tipoCuenta1: 'ahorro', sueldo: 4500 },
        { empresaIdx: 0, dni: '50678901', nombres: 'Jorge Luis', apellidos: 'Quispe Vargas', celular: '999222333', correo: 'jorge.quispe@constructora.com', cargo: 'Almacenero', tipoContrato: 'CAS', estado: 'activo', banco1: 'Pichincha', cuenta1: '234567890123', tipoCuenta1: 'ahorro', sueldo: 1200 },
        { empresaIdx: 1, dni: '51789012', nombres: 'María Isabel', apellidos: 'Torres Rivas', celular: '998111333', correo: 'maria.torres@transportes.com', cargo: 'Gerente de Operaciones', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '345678901234', tipoCuenta1: 'ahorro', sueldo: 7200 },
        { empresaIdx: 1, dni: '52890123', nombres: 'Raúl Felipe', apellidos: 'Cárdenas Díaz', celular: '998444555', correo: 'raul.cardenas@transportes.com', cargo: 'Jefe de Flota', tipoContrato: 'planilla', estado: 'activo', banco1: 'Interbank', cuenta1: '456789012345', tipoCuenta1: 'corriente', banco2: 'Scotiabank', cuenta2: '567890123456', tipoCuenta2: 'CTS', sueldo: 4100 },
        { empresaIdx: 1, dni: '53901234', nombres: 'Sofía Alejandra', apellidos: 'Reyes Campos', celular: '998666777', correo: 'sofia.reyes@transportes.com', cargo: 'Asistente Logística', tipoContrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '678901234567', tipoCuenta1: 'ahorro', sueldo: 1800 },
        { empresaIdx: 1, dni: '54012345', nombres: 'Diego Armando', apellidos: 'Vega Zúñiga', celular: '998888999', correo: 'diego.vega@transportes.com', cargo: 'Chofer Pesado', tipoContrato: 'CAS', estado: 'activo', banco1: 'Nacion', cuenta1: '789012345678', tipoCuenta1: 'ahorro', sueldo: 2500 },
        { empresaIdx: 1, dni: '55123456', nombres: 'Valeria Sofía', apellidos: 'Mori Lozano', celular: '999000222', correo: 'valeria.mori@transportes.com', cargo: 'Chofer Ligero', tipoContrato: 'CAS', estado: 'vacaciones', banco1: 'BCP', cuenta1: '890123456789', tipoCuenta1: 'ahorro', sueldo: 2100 },
        { empresaIdx: 2, dni: '56234567', nombres: 'Óscar Manuel', apellidos: 'Salazar Paredes', celular: '997111444', correo: 'oscar.salazar@inversiones.com', cargo: 'Director Financiero', tipoContrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '901234567890', tipoCuenta1: 'corriente', sueldo: 9800 },
        { empresaIdx: 2, dni: '57345678', nombres: 'Claudia Patricia', apellidos: 'Rivera Gutiérrez', celular: '997222555', correo: 'claudia.rivera@inversiones.com', cargo: 'Contadora General', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '012345678901', tipoCuenta1: 'ahorro', banco2: 'Interbank', cuenta2: '123450987654', tipoCuenta2: 'interbancario', sueldo: 5500 },
        { empresaIdx: 2, dni: '58456789', nombres: 'Felipe Andrés', apellidos: 'Chávez Núñez', celular: '997333666', correo: 'felipe.chavez@inversiones.com', cargo: 'Analista de Inversiones', tipoContrato: 'planilla', estado: 'activo', banco1: 'Scotiabank', cuenta1: '234569012345', tipoCuenta1: 'ahorro', sueldo: 3500 },
        { empresaIdx: 2, dni: '59567890', nombres: 'Gabriela Paz', apellidos: 'Delgado Rojas', celular: '997444777', correo: 'gabriela.delgado@inversiones.com', cargo: 'Asistente Comercial', tipoContrato: 'CAS', estado: 'activo', banco1: 'Pichincha', cuenta1: '345670123456', tipoCuenta1: 'ahorro', sueldo: 1600 },
        { empresaIdx: 2, dni: '60678901', nombres: 'Humberto Rafael', apellidos: 'Castro Mendoza', celular: '997555888', correo: 'humberto.castro@inversiones.com', cargo: 'Recepcionista', tipoContrato: 'planilla', estado: 'licencia', banco1: 'Nacion', cuenta1: '456781234567', tipoCuenta1: 'ahorro', sueldo: 1100 },
        { empresaIdx: 3, dni: '61789012', nombres: 'Luis Alberto', apellidos: 'Montesinos Puma', celular: '996111333', correo: 'luis.montesinos@minera.com', cargo: 'Superintendente de Mina', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '567892345678', tipoCuenta1: 'corriente', sueldo: 12000 },
        { empresaIdx: 3, dni: '62890123', nombres: 'Carmen Rosa', apellidos: 'Huancahuari Tito', celular: '996222444', correo: 'carmen.huancahuari@minera.com', cargo: 'Ingeniera de Seguridad', tipoContrato: 'planilla', estado: 'activo', banco1: 'Interbank', cuenta1: '678903456789', tipoCuenta1: 'ahorro', sueldo: 6400 },
        { empresaIdx: 3, dni: '63901234', nombres: 'Mario Antonio', apellidos: 'Condori Quispe', celular: '996333555', correo: 'mario.condori@minera.com', cargo: 'Operador de Equipos', tipoContrato: 'CAS', estado: 'activo', banco1: 'BBVA', cuenta1: '789014567890', tipoCuenta1: 'ahorro', sueldo: 2800 },
        { empresaIdx: 3, dni: '64012345', nombres: 'Elena Beatriz', apellidos: 'Apaza Nina', celular: '996444666', correo: 'elena.apaza@minera.com', cargo: 'Secretaria', tipoContrato: 'planilla', estado: 'activo', banco1: 'Scotiabank', cuenta1: '890125678901', tipoCuenta1: 'ahorro', sueldo: 1900 },
        { empresaIdx: 3, dni: '65123456', nombres: 'Pedro Pablo', apellidos: 'Arias Mamani', celular: '996555777', correo: 'pedro.arias@minera.com', cargo: 'Ayudante General', tipoContrato: 'recibo_honorarios', estado: 'activo', banco1: 'Pichincha', cuenta1: '901236789012', tipoCuenta1: 'ahorro', sueldo: 1300 },
        { empresaIdx: 4, dni: '66234567', nombres: 'Juan Carlos', apellidos: 'Vásquez Ríos', celular: '995111444', correo: 'juan.vasquez@servicios.com', cargo: 'Gerente Comercial', tipoContrato: 'planilla', estado: 'activo', banco1: 'BCP', cuenta1: '012347890123', tipoCuenta1: 'corriente', sueldo: 6800 },
        { empresaIdx: 4, dni: '67345678', nombres: 'María Cristina', apellidos: 'López García', celular: '995222555', correo: 'maria.lopez@servicios.com', cargo: 'Supervisora de Limpieza', tipoContrato: 'planilla', estado: 'activo', banco1: 'BBVA', cuenta1: '123458901234', tipoCuenta1: 'ahorro', sueldo: 2000 },
        { empresaIdx: 4, dni: '68456789', nombres: 'Ronald David', apellidos: 'Pineda Torres', celular: '995333666', correo: 'ronald.pineda@servicios.com', cargo: 'Técnico de Mantenimiento', tipoContrato: 'CAS', estado: 'activo', banco1: 'Interbank', cuenta1: '234569012345', tipoCuenta1: 'ahorro', sueldo: 2400 },
        { empresaIdx: 4, dni: '69567890', nombres: 'Diana Carolina', apellidos: 'Meza Ramos', celular: '995444777', correo: 'diana.meza@servicios.com', cargo: 'Coordinadora de RR.HH.', tipoContrato: 'planilla', estado: 'activo', banco1: 'Scotiabank', cuenta1: '345670123456', tipoCuenta1: 'ahorro', banco2: 'Nacion', cuenta2: '456781234567', tipoCuenta2: 'CTS', sueldo: 3200 },
        { empresaIdx: 4, dni: '70678901', nombres: 'Fidel Ernesto', apellidos: 'Sandoval Huerta', celular: '995555888', correo: 'fidel.sandoval@servicios.com', cargo: 'Vigilante', tipoContrato: 'CAS', estado: 'activo', banco1: 'Pichincha', cuenta1: '567892345678', tipoCuenta1: 'ahorro', sueldo: 1100 },
      ];

      let personalCreado = 0;
      const personalIds: Array<{ id: string; empresa_id: string; idx: number }> = [];
      for (const p of personalSeed) {
        const empId = empresasIds[p.empresaIdx].id;
        const { data: result, error } = await supabase.from('personal').insert({
          empresa_id: empId,
          dni: p.dni, nombres: p.nombres, apellidos: p.apellidos,
          celular: p.celular || null, correo: p.correo || null, cargo: p.cargo || null,
          tipo_contrato: p.tipoContrato, estado: p.estado,
          banco1: p.banco1 || null, cuenta1: p.cuenta1 || null, tipo_cuenta1: p.tipoCuenta1 || null,
          banco2: p.banco2 || null, cuenta2: p.cuenta2 || null, tipo_cuenta2: p.tipoCuenta2 || null,
          sueldo_base: p.sueldo,
        }).select('id, empresa_id').single();

        if (!error && result) {
          personalIds.push({ id: result.id, empresa_id: result.empresa_id, idx: p.empresaIdx });
          personalCreado++;
        }
      }

      // ─── Asistencias: 20 días hábiles ─────────────────────────
      const hoy = new Date();
      const diasHabiles: string[] = [];
      const iterador = new Date(hoy);
      iterador.setDate(iterador.getDate() - 60);

      while (diasHabiles.length < 20) {
        const dia = iterador.getDay();
        if (dia >= 1 && dia <= 5) diasHabiles.push(iterador.toISOString().split('T')[0]);
        iterador.setDate(iterador.getDate() + 1);
      }

      const perfilesHorario = [
        { entrada: '08:00', salida: '17:00', probTardanza: 0.05, probHe: 0.1 },
        { entrada: '08:15', salida: '17:30', probTardanza: 0.3, probHe: 0.2 },
        { entrada: '07:45', salida: '16:45', probTardanza: 0.0, probHe: 0.05 },
        { entrada: '08:30', salida: '18:30', probTardanza: 0.5, probHe: 0.6 },
        { entrada: '07:00', salida: '15:00', probTardanza: 0.05, probHe: 0.0 },
        { entrada: '09:00', salida: '18:00', probTardanza: 0.4, probHe: 0.15 },
        { entrada: '08:00', salida: '20:00', probTardanza: 0.1, probHe: 0.9 },
      ];

      let asistenciasCreadas = 0;
      for (const pid of personalIds) {
        const perfil = perfilesHorario[pid.idx % perfilesHorario.length];
        for (const fechaStr of diasHabiles) {
          const hash = (pid.idx + fechaStr).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          if (hash % 11 === 0) continue;

          let entrada = perfil.entrada;
          let salida = perfil.salida;

          if (Math.random() < perfil.probTardanza) {
            const min = Math.floor(Math.random() * 30) + 5;
            const [h, m] = entrada.split(':').map(Number);
            const total = h * 60 + m + min;
            entrada = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
          }

          if (Math.random() < perfil.probHe) {
            const min = (Math.floor(Math.random() * 3) + 1) * 60;
            const [h, m] = salida.split(':').map(Number);
            const total = h * 60 + m + min;
            salida = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
          }

          const { error: aErr } = await supabase.from('asistencias').insert({
            personal_id: pid.id, empresa_id: pid.empresa_id,
            fecha: fechaStr, hora_entrada: entrada, hora_salida: salida,
          });
          if (!aErr) asistenciasCreadas++;
        }
      }

      // ─── Cargar en store ─────────────────────────────────────
      set({
        empresas: empresasIds.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          ruc: empresasData[empresasIds.indexOf(e)].ruc,
          color: empresasData[empresasIds.indexOf(e)].color,
          createdAt: new Date().toISOString(),
        })),
        empresaActivaId: empresasIds[0].id,
      });
      await get().cargarPersonal(empresasIds[0].id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[hrStore] Error cargando datos demo:', msg);
      throw err; // relanzar para que el componente pueda mostrar toast.error
    }
  },
}));

export default useHRStore;

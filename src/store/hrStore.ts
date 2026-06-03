import { create } from 'zustand';
import type { HRStore, Empresa, Personal, RegistroAsistencia, ResumenSemanalPersonal } from '../types';

const HR_KEY = 'saraia-hr-data';
const JORNADA_MINUTOS = 480; // 8 horas

interface SavedHRState {
  empresas: Empresa[];
  personal: Personal[];
  asistencias: RegistroAsistencia[];
  empresaActivaId: number | null;
  proximoIdHR: number;
}

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

function loadState(): SavedHRState {
  try {
    const saved = localStorage.getItem(HR_KEY);
    if (saved) return JSON.parse(saved) as SavedHRState;
  } catch {
    // Ignorar errores de parseo
  }
  return { empresas: [], personal: [], asistencias: [], empresaActivaId: null, proximoIdHR: 1 };
}

function saveState(state: SavedHRState): void {
  try {
    localStorage.setItem(HR_KEY, JSON.stringify(state));
  } catch {
    // Ignorar errores de escritura
  }
}

const useHRStore = create<HRStore>()((set, get) => {
  const initial = loadState();

  return {
    empresas: initial.empresas,
    personal: initial.personal,
    asistencias: initial.asistencias,
    empresaActivaId: initial.empresaActivaId,
    proximoIdHR: initial.proximoIdHR,

    // ─── Empresas ────────────────────────────────────────────────

    agregarEmpresa: (data): Empresa => {
      const state = get();
      const empresa: Empresa = { ...data, id: state.proximoIdHR, createdAt: new Date().toISOString() };
      set((s) => ({
        empresas: [...s.empresas, empresa],
        proximoIdHR: s.proximoIdHR + 1,
      }));
      saveState(get());
      return empresa;
    },

    editarEmpresa: (id, data) => {
      set((s) => ({
        empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...data } : e)),
      }));
      saveState(get());
    },

    eliminarEmpresa: (id) => {
      set((s) => ({
        empresas: s.empresas.filter((e) => e.id !== id),
        personal: s.personal.filter((p) => p.empresaId !== id),
        asistencias: s.asistencias.filter((a) => a.empresaId !== id),
        empresaActivaId: s.empresaActivaId === id ? null : s.empresaActivaId,
      }));
      saveState(get());
    },

    setEmpresaActiva: (id) => {
      set({ empresaActivaId: id });
      saveState(get());
    },

    // ─── Personal ────────────────────────────────────────────────

    agregarPersonal: (data): Personal => {
      const state = get();
      const persona: Personal = { ...data, id: state.proximoIdHR, createdAt: new Date().toISOString() };
      set((s) => ({
        personal: [...s.personal, persona],
        proximoIdHR: s.proximoIdHR + 1,
      }));
      saveState(get());
      return persona;
    },

    editarPersonal: (id, data) => {
      set((s) => ({
        personal: s.personal.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
      saveState(get());
    },

    eliminarPersonal: (id) => {
      set((s) => ({
        personal: s.personal.filter((p) => p.id !== id),
        asistencias: s.asistencias.filter((a) => a.personalId !== id),
      }));
      saveState(get());
    },

    getPersonalDeEmpresa: (empresaId) => {
      return get().personal.filter((p) => p.empresaId === empresaId);
    },

    // ─── Asistencias ─────────────────────────────────────────────

    registrarAsistencia: (data): RegistroAsistencia => {
      const state = get();
      const { normales, extras } = calcularHoras(data.horaEntrada, data.horaSalida);
      const asistencia: RegistroAsistencia = {
        ...data,
        id: state.proximoIdHR,
        horasNormales: normales,
        horasExtras: extras,
      };
      set((s) => ({
        asistencias: [...s.asistencias, asistencia],
        proximoIdHR: s.proximoIdHR + 1,
      }));
      saveState(get());
      return asistencia;
    },

    editarAsistencia: (id, data) => {
      const state = get();
      const existente = state.asistencias.find((a) => a.id === id);
      if (!existente) return;
      const merged = { ...existente, ...data };
      // Recalcular horas si cambió entrada o salida
      if (data.horaEntrada !== undefined || data.horaSalida !== undefined) {
        const { normales, extras } = calcularHoras(merged.horaEntrada, merged.horaSalida);
        merged.horasNormales = normales;
        merged.horasExtras = extras;
      }
      set((s) => ({
        asistencias: s.asistencias.map((a) => (a.id === id ? merged : a)),
      }));
      saveState(get());
    },

    eliminarAsistencia: (id) => {
      set((s) => ({
        asistencias: s.asistencias.filter((a) => a.id !== id),
      }));
      saveState(get());
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

        // Calcular días hábiles en el período (lun-vie)
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
          personalId: persona.id,
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

    cargarDatosDemo: (): void => {
      const state = get();
      if (state.empresas.length > 0) return; // ya hay datos

      let id = state.proximoIdHR;

      // ─── Empresas ─────────────────────────────────────────────
      const emp1 = { id: id++, nombre: 'Transportes Rápidos S.A.C.', ruc: '20123456789', color: '#2563eb', createdAt: new Date().toISOString() };
      const emp2 = { id: id++, nombre: 'Inversiones del Sur E.I.R.L.', ruc: '20987654321', color: '#059669', createdAt: new Date().toISOString() };

      // ─── Personal ─────────────────────────────────────────────
      const p1 = { id: id++, empresaId: emp1.id, dni: '45123456', nombres: 'Ana María', apellidos: 'García López', celular: '999111222', correo: 'ana.garcia@email.com', cargo: 'Asistente Administrativa', tipoContrato: 'planilla' as const, estado: 'activo' as const, banco1: 'BCP' as const, numeroCuenta1: '19123456789012', tipoCuenta1: 'ahorro' as const, banco2: null, numeroCuenta2: null, tipoCuenta2: null, sueldoBase: 1500, createdAt: new Date().toISOString() };
      const p2 = { id: id++, empresaId: emp1.id, dni: '46234567', nombres: 'Carlos Miguel', apellidos: 'Pérez Castro', celular: '999333444', correo: 'carlos.perez@email.com', cargo: 'Chofer', tipoContrato: 'planilla' as const, estado: 'activo' as const, banco1: 'Interbank' as const, numeroCuenta1: '098765432109', tipoCuenta1: 'corriente' as const, banco2: 'BBVA' as const, numeroCuenta2: '00123456789012345678', tipoCuenta2: 'CTS' as const, sueldoBase: 1800, createdAt: new Date().toISOString() };
      const p3 = { id: id++, empresaId: emp1.id, dni: '47345678', nombres: 'Rosa Elena', apellidos: 'Mendoza Torres', celular: '999555666', correo: 'rosa.mendoza@email.com', cargo: 'Supervisora de Operaciones', tipoContrato: 'CAS' as const, estado: 'activo' as const, banco1: 'Scotiabank' as const, numeroCuenta1: '123456789012', tipoCuenta1: 'ahorro' as const, banco2: null, numeroCuenta2: null, tipoCuenta2: null, sueldoBase: 2500, createdAt: new Date().toISOString() };
      const p4 = { id: id++, empresaId: emp2.id, dni: '48456789', nombres: 'Pedro Antonio', apellidos: 'Ramírez Silva', celular: '999777888', correo: 'pedro.ramirez@email.com', cargo: 'Contador', tipoContrato: 'recibo_honorarios' as const, estado: 'activo' as const, banco1: 'BCP' as const, numeroCuenta1: '123987654321', tipoCuenta1: 'corriente' as const, banco2: 'Nacion' as const, numeroCuenta2: '987654321098', tipoCuenta2: 'interbancario' as const, sueldoBase: 3200, createdAt: new Date().toISOString() };
      const p5 = { id: id++, empresaId: emp2.id, dni: '49567890', nombres: 'Lucía Fernanda', apellidos: 'Huamán Paredes', celular: '999000111', correo: 'lucia.huaman@email.com', cargo: 'Asistente de Ventas', tipoContrato: 'planilla' as const, estado: 'activo' as const, banco1: 'BBVA' as const, numeroCuenta1: '00123456789012345679', tipoCuenta1: 'ahorro' as const, banco2: null, numeroCuenta2: null, tipoCuenta2: null, sueldoBase: 1300, createdAt: new Date().toISOString() };
      const p6 = { id: id++, empresaId: emp2.id, dni: '50678901', nombres: 'Jorge Luis', apellidos: 'Quispe Vargas', celular: '999222333', correo: 'jorge.quispe@email.com', cargo: 'Almacenero', tipoContrato: 'CAS' as const, estado: 'inactivo' as const, banco1: 'Pichincha' as const, numeroCuenta1: '234567890123', tipoCuenta1: 'ahorro' as const, banco2: null, numeroCuenta2: null, tipoCuenta2: null, sueldoBase: 1100, createdAt: new Date().toISOString() };

      // ─── Asistencias (semana actual) ──────────────────────────
      const hoy = new Date();
      const diaSem = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSem === 0 ? 6 : diaSem - 1));

      const asistencias: typeof state.asistencias = [];
      const horarios: [string, string, number?][] = [
        ['08:00', '17:00'],
        ['08:15', '18:30', 1], // 1 = hora extra nocturna
        ['07:50', '16:30'],
        ['09:00', '18:00'],
        ['08:30', '17:30'],
      ];

      const personalIds = [p1, p2, p3, p4, p5];
      for (let d = 0; d < 5; d++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + d);
        const fechaStr = fecha.toISOString().split('T')[0];
        personalIds.forEach((persona, idx) => {
          if (d === 0 && idx === 4) return; // Lucía no vino el lunes
          if (d === 3 && idx === 0) return; // Ana no vino el jueves
          const [entrada, salida, tipoHE] = horarios[(idx + d) % horarios.length];
          const totalMin = (parseInt(salida.split(':')[0]) * 60 + parseInt(salida.split(':')[1])) - (parseInt(entrada.split(':')[0]) * 60 + parseInt(entrada.split(':')[1]));
          const extras = totalMin > 480 ? (totalMin - 480) / 60 : 0;
          const normales = totalMin > 480 ? 8 : +(totalMin / 60).toFixed(2);
          asistencias.push({
            id: id++,
            personalId: persona.id,
            empresaId: persona.empresaId,
            fecha: fechaStr,
            horaEntrada: entrada,
            horaSalida: salida,
            horasNormales: normales,
            horasExtras: +extras.toFixed(2),
            tipoHoraExtra: extras > 0 ? (tipoHE === 1 ? 'nocturna' as const : 'normal' as const) : null,
            observacion: null,
          });
        });
      }
      // Una falta marcada para demo
      asistencias.push({
        id: id++,
        personalId: p1.id,
        empresaId: emp1.id,
        fecha: new Date(lunes.getTime() + 3 * 86400000).toISOString().split('T')[0],
        horaEntrada: null,
        horaSalida: null,
        horasNormales: 0,
        horasExtras: 0,
        tipoHoraExtra: null,
        observacion: 'Falta justificada',
      });

      set({
        empresas: [emp1, emp2],
        personal: [p1, p2, p3, p4, p5, p6],
        asistencias,
        empresaActivaId: emp1.id,
        proximoIdHR: id,
      });
      saveState(get());
    },
  };
});

export default useHRStore;

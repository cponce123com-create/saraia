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
  };
});

export default useHRStore;

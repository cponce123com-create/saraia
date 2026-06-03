import * as XLSX from 'xlsx';
import type { Personal, RegistroAsistencia, ResumenSemanalPersonal, Empresa } from '../types';

function formatDateForFilename(): string {
  return new Date().toISOString().split('T')[0];
}

// Exporta directorio de personal (con datos bancarios) de una empresa
export function exportarDirectorioPersonal(empresa: Empresa, personal: Personal[]): void {
  const rows = personal.map((p) => ({
    DNI: p.dni,
    Nombres: p.nombres,
    Apellidos: p.apellidos,
    Celular: p.celular || '',
    Correo: p.correo || '',
    Cargo: p.cargo || '',
    'Tipo Contrato': p.tipoContrato,
    Estado: p.estado,
    'Sueldo Base (S/)': p.sueldoBase ?? '',
    'Banco 1': p.banco1 || '',
    'N° Cuenta 1': p.numeroCuenta1 || '',
    'Tipo Cuenta 1': p.tipoCuenta1 || '',
    'Banco 2': p.banco2 || '',
    'N° Cuenta 2': p.numeroCuenta2 || '',
    'Tipo Cuenta 2': p.tipoCuenta2 || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Directorio');
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 25 },
    { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 16 },
  ];

  const filename = `SaraIA_${empresa.nombre}_Directorio_${formatDateForFilename()}.xlsx`;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Exporta reporte de asistencia por período
export function exportarAsistenciaPeriodo(
  empresa: Empresa,
  personal: Personal[],
  asistencias: RegistroAsistencia[],
  _desde: string,
  _hasta: string,
): void {
  const asistenciasPorPersona = new Map<number, RegistroAsistencia[]>();
  for (const a of asistencias) {
    if (!asistenciasPorPersona.has(a.personalId)) asistenciasPorPersona.set(a.personalId, []);
    asistenciasPorPersona.get(a.personalId)!.push(a);
  }

  const rows: Record<string, string | number>[] = [];
  for (const persona of personal) {
    const regs = asistenciasPorPersona.get(persona.id) || [];
    const totalHN = regs.reduce((s, a) => s + a.horasNormales, 0);
    const totalHE = regs.reduce((s, a) => s + a.horasExtras, 0);
    rows.push({
      DNI: persona.dni,
      Nombres: persona.nombres,
      Apellidos: persona.apellidos,
      Cargo: persona.cargo || '',
      'Días Trabajados': regs.length,
      'Horas Normales': +totalHN.toFixed(2),
      'Horas Extras': +totalHE.toFixed(2),
      'Total Horas': +(totalHN + totalHE).toFixed(2),
    });
  }

  // Totales
  const totalHN = rows.reduce((s, r) => s + (r['Horas Normales'] as number), 0);
  const totalHE = rows.reduce((s, r) => s + (r['Horas Extras'] as number), 0);
  rows.push({
    DNI: '', Nombres: 'TOTALES', Apellidos: '', Cargo: '',
    'Días Trabajados': rows.reduce((s, r) => s + (r['Días Trabajados'] as number), 0),
    'Horas Normales': +totalHN.toFixed(2),
    'Horas Extras': +totalHE.toFixed(2),
    'Total Horas': +(totalHN + totalHE).toFixed(2),
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];

  const filename = `SaraIA_${empresa.nombre}_Asistencia_${formatDateForFilename()}.xlsx`;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Exporta datos para boleta/pago (sin montos calculados, solo datos base)
export function exportarDatosPago(
  empresa: Empresa,
  personal: Personal[],
  resumen: ResumenSemanalPersonal[],
  mes: string,
): void {
  const resumenMap = new Map(resumen.map((r) => [r.personalId, r]));

  const rows = personal.map((p) => {
    const r = resumenMap.get(p.id);
    return {
      DNI: p.dni,
      Nombres: p.nombres,
      Apellidos: p.apellidos,
      Cargo: p.cargo || '',
      'Tipo Contrato': p.tipoContrato,
      'Sueldo Base (S/)': p.sueldoBase ?? '',
      'Días Trabajados': r?.totalDiasTrabajados ?? 0,
      'Horas Normales': r?.totalHorasNormales ?? 0,
      'Horas Extras': r?.totalHorasExtras ?? 0,
      'Días Falta': r?.diasFaltantes ?? 0,
      Tardanzas: r?.tardanzas ?? 0,
      'Banco 1': p.banco1 || '',
      'N° Cuenta 1': p.numeroCuenta1 || '',
      'Tipo Cuenta 1': p.tipoCuenta1 || '',
      'Banco 2': p.banco2 || '',
      'N° Cuenta 2': p.numeroCuenta2 || '',
      'Tipo Cuenta 2': p.tipoCuenta2 || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Pago');
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 16 },
  ];

  const filename = `SaraIA_${empresa.nombre}_Pago_${mes}_${formatDateForFilename()}.xlsx`;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

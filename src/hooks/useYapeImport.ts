import { useState } from 'react';
import toast from 'react-hot-toast';
import { parsearExcelYape } from '../utils/excelParser';
import useGastosStore from '../store/gastosStore';
import type { ResultadoImportacion, ResultadoParseo, GastoPendiente } from '../types';

interface ImportResult {
  gastos: GastoPendiente[];
  resumen: { leidas: number; saltadas: number; totalFilas: number; errores: string[] };
  resultado: ResultadoImportacion;
}

export function useYapeImport(empresaId?: string): { importar: (file: File) => Promise<ImportResult | undefined>; importando: boolean } {
  const [importando, setImportando] = useState(false);
  const importarGastos = useGastosStore((s) => s.importarGastos);

  const importar = async (file: File): Promise<ImportResult | undefined> => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo archivos .xlsx o .xls');
      return;
    }

    if (!empresaId) {
      toast.error('Selecciona una empresa primero');
      return;
    }

    setImportando(true);
    try {
      const { gastos, resumen }: ResultadoParseo = await parsearExcelYape(file);

      if (gastos.length === 0) {
        if (resumen.errores && resumen.errores.length > 0) {
          toast.error('Error: ' + resumen.errores[0]);
        } else {
          toast.error('No se encontraron gastos en el archivo');
        }
        return;
      }

      const resultado: ResultadoImportacion = await importarGastos(gastos, empresaId);

      let msg = resultado.insertados + ' gastos importados';
      if (resumen) {
        msg += ' (' + resumen.leidas + ' leidas';
        if (resumen.saltadas > 0) msg += ', ' + resumen.saltadas + ' saltadas';
        msg += ')';
      }
      toast.success(msg);

      if (resultado.duplicados > 0) {
        toast(resultado.duplicados + ' duplicados ignorados (ya existian)', {
          icon: 'i',
          duration: 4000,
          style: { background: '#e0f2fe', color: '#075985' },
        });
      }

      if (resumen.errores && resumen.errores.length > 0) {
        toast(resumen.errores.slice(0, 3).join(' | '), {
          icon: 'W',
          duration: 6000,
          style: { background: '#fef3c7', color: '#92400e', fontSize: '13px' },
        });
      }

      return { gastos, resumen, resultado };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setImportando(false);
    }
  };

  return { importar, importando };
}

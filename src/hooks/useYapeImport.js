import { useState } from 'react';
import toast from 'react-hot-toast';
import { parsearExcelYape } from '../utils/excelParser';
import useGastosStore from '../store/gastosStore';

export function useYapeImport() {
  const [importando, setImportando] = useState(false);
  const importarGastos = useGastosStore((s) => s.importarGastos);

  const importar = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo archivos .xlsx o .xls');
      return;
    }

    setImportando(true);
    try {
      const { gastos, resumen } = await parsearExcelYape(file);

      if (gastos.length === 0) {
        if (resumen.errores && resumen.errores.length > 0) {
          toast.error('Error: ' + resumen.errores[0]);
        } else {
          toast.error('No se encontraron gastos en el archivo');
        }
        return;
      }

      const resultado = importarGastos(gastos);

      // Toast con resumen completo
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
      toast.error(err.message);
    } finally {
      setImportando(false);
    }
  };

  return { importar, importando };
}

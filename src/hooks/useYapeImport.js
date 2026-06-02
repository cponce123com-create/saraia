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

      console.log('Excel parseado:', resumen);
      if (resumen.errores && resumen.errores.length > 0) {
        console.warn('Errores de parseo:', resumen.errores);
      }

      if (gastos.length === 0) {
        if (resumen.errores && resumen.errores.length > 0) {
          toast.error('Error: ' + resumen.errores[0]);
        } else {
          toast.error('No se encontraron gastos en el archivo');
        }
        return;
      }

      importarGastos(gastos);

      let msg = gastos.length + ' gastos importados';
      if (resumen) {
        msg += ' (' + resumen.leidas + ' leidas';
        if (resumen.saltadas > 0) msg += ', ' + resumen.saltadas + ' saltadas';
        msg += ' de ' + resumen.totalFilas + ' filas)';
      }
      toast.success(msg);

      if (resumen.errores && resumen.errores.length > 0) {
        toast(resumen.errores.slice(0, 3).join(' | '), {
          icon: 'W',
          duration: 6000,
          style: { background: '#fef3c7', color: '#92400e', fontSize: '13px' },
        });
      }

      return { gastos, resumen };
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImportando(false);
    }
  };

  return { importar, importando };
}

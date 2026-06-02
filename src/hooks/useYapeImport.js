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
        toast.error('No se encontraron gastos en el archivo');
        return;
      }

      importarGastos(gastos);

      // Toast más informativo con resumen
      let msg = `${gastos.length} gastos importados`;
      if (resumen) {
        msg += ` (${resumen.leidas} leídas`;
        if (resumen.saltadas > 0) msg += `, ${resumen.saltadas} saltadas`;
        msg += ` de ${resumen.totalFilas} filas)`;
      }
      toast.success(msg);

      return { gastos, resumen };
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImportando(false);
    }
  };

  return { importar, importando };
}

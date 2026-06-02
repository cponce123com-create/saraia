import { useState } from 'react';
import toast from 'react-hot-toast';
import { parsearExcelYape } from '../utils/excelParser';
import useGastosStore from '../store/gastosStore';

export function useYapeImport() {
  const [importando, setImportando] = useState(false);
  const importarGastos = useGastosStore((s) => s.importarGastos);

  const importar = async (file) => {
    if (!file) return;
    
    // Validar extensión
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo archivos .xlsx o .xls');
      return;
    }

    setImportando(true);
    try {
      const gastos = await parsearExcelYape(file);
      
      if (gastos.length === 0) {
        toast.error('No se encontraron gastos en el archivo');
        return;
      }

      importarGastos(gastos);
      toast.success(`${gastos.length} gastos importados correctamente`);
      return gastos;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImportando(false);
    }
  };

  return { importar, importando };
}

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useYapeImport } from '../hooks/useYapeImport';

interface SubirExcelProps {
  empresaId?: string;
}

export default function SubirExcel({ empresaId }: SubirExcelProps) {
  const { importar, importando } = useYapeImport(empresaId);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    await importar(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-white'
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleChange} className="hidden" />

      {importando ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-gray-600">Procesando archivo...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {dragOver ? (
            <>
              <Upload size={40} className="text-blue-500" />
              <p className="font-semibold text-blue-600">Suelta el archivo aquí</p>
            </>
          ) : (
            <>
              <FileSpreadsheet size={40} className="text-green-600" />
              <p className="font-semibold text-gray-900">Subir Reporte YAPE</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Arrastra tu archivo .xlsx de Yape Empresas o haz clic para seleccionar
              </p>
              <span className="text-xs text-gray-400 mt-1">Columnas requeridas: Fecha, Descripción, Monto</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

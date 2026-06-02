import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import useGastosStore from '../store/gastosStore';

export default function Exportacion() {
  const gastos = useGastosStore((s) => s.gastos);
  const facturas = useGastosStore((s) => s.facturas);

  const handleExport = () => {
    if (gastos.length === 0) return;

    // Preparar datos para Excel
    const rows = gastos.map((g) => {
      const factura = facturas.find((f) => f.id === g.facturaId);
      return {
        Fecha: g.fecha,
        Descripción: g.descripcion,
        Tipo: g.tipo === 'gasto' ? 'Gasto' : 'Ingreso',
        'Monto (S/)': g.monto,
        'Estado Factura':
          g.estado === 'verificado'
            ? 'Verificado'
            : g.estado === 'conflicto'
              ? 'Conflicto'
              : g.estado === 'sin_factura'
                ? 'Sin factura'
                : 'Pendiente',
        Proveedor: factura?.ocrData?.proveedor || '',
        'RUC Emisor': factura?.ocrData?.ruc || '',
        'Fecha Factura': factura?.ocrData?.fecha || '',
        'Monto Factura (S/)': factura?.ocrData?.monto || '',
        'Tipo Comprobante': factura?.ocrData?.tipo_comprobante || '',
        'N° Comprobante': factura?.ocrData?.numero_comprobante || '',
        'Score Match': factura?.matchScore ? `${(factura.matchScore * 100).toFixed(0)}%` : '',
      };
    });

    // Agregar fila de totales
    const totalGastos = gastos.filter((g) => g.tipo === 'gasto').reduce((s, g) => s + g.monto, 0);
    // const totalIngresos = ...; // no usado actualmente

    rows.push({
      Fecha: '',
      Descripción: 'TOTAL',
      Tipo: '',
      'Monto (S/)': totalGastos,
      'Estado Factura': '',
      Proveedor: '',
      'RUC Emisor': '',
      'Fecha Factura': '',
      'Monto Factura (S/)': '',
      'Tipo Comprobante': '',
      'N° Comprobante': '',
      'Score Match': '',
    });

    // Resumen por proveedor
    const resumenProveedor: Record<string, { count: number; total: number; verificados: number }> = {};
    gastos.forEach((g) => {
      const factura = facturas.find((f) => f.id === g.facturaId);
      const proveedor = factura?.ocrData?.proveedor || 'Sin proveedor';
      if (!resumenProveedor[proveedor]) {
        resumenProveedor[proveedor] = { count: 0, total: 0, verificados: 0 };
      }
      resumenProveedor[proveedor].count++;
      resumenProveedor[proveedor].total += g.monto;
      if (g.estado === 'verificado') resumenProveedor[proveedor].verificados++;
    });

    const resumenRows = Object.entries(resumenProveedor).map(([proveedor, data]) => ({
      Proveedor: proveedor,
      'Cant. Gastos': data.count,
      'Total (S/)': data.total,
      Verificados: data.verificados,
      Pendientes: data.count - data.verificados,
    }));

    // Crear libro Excel
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Gastos');

    // Ancho de columnas
    ws1['!cols'] = [
      { wch: 12 },
      { wch: 35 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 25 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
    ];

    const ws2 = XLSX.utils.json_to_sheet(resumenRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por Proveedor');
    ws2['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

    const filename = `SaraIA_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Descargar
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalGastos = gastos.filter((g) => g.tipo === 'gasto').reduce((s, g) => s + g.monto, 0);
  const verificados = gastos.filter((g) => g.estado === 'verificado').length;
  const conflictos = gastos.filter((g) => g.estado === 'conflicto').length;
  const sinFactura = gastos.filter((g) => g.estado === 'sin_factura').length;

  if (gastos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileSpreadsheet size={48} className="mb-4" />
        <p className="text-lg font-medium">No hay datos para exportar</p>
        <p className="text-sm mt-1">Primero importa un reporte YAPE</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Exportar Balance</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Gastos</p>
            <p className="text-lg font-bold text-gray-900">S/ {totalGastos.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Verificados</p>
            <p className="text-lg font-bold text-green-600">{verificados}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">En conflicto</p>
            <p className="text-lg font-bold text-orange-600">{conflictos}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Sin factura</p>
            <p className="text-lg font-bold text-red-600">{sinFactura}</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 mb-6">
          <p>
            <strong>El Excel incluirá:</strong>
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Hoja &quot;Gastos&quot;: lista completa con estado y datos de factura</li>
            <li>Hoja &quot;Resumen por Proveedor&quot;: totales agrupados</li>
            <li>Fila de totales al final</li>
          </ul>
        </div>

        {conflictos > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm text-orange-800">
            <AlertTriangle size={18} />
            <span>
              {conflictos} gasto{conflictos !== 1 ? 's' : ''} en conflicto. Resuélvelos antes de exportar para un
              balance más preciso.
            </span>
          </div>
        )}

        <button
          onClick={handleExport}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Exportar a Excel
        </button>
      </div>

      {/* Preview de lo que se exportará */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm">Vista previa ({gastos.length} registros)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Fecha</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Descripción</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Monto</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Estado</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Proveedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.slice(0, 10).map((g) => {
                const factura = facturas.find((f) => f.id === g.facturaId);
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{g.fecha}</td>
                    <td className="px-3 py-2 font-medium truncate max-w-[200px]">{g.descripcion}</td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${g.tipo === 'gasto' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      S/ {g.monto.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          g.estado === 'verificado'
                            ? 'bg-green-100 text-green-700'
                            : g.estado === 'conflicto'
                              ? 'bg-orange-100 text-orange-700'
                              : g.estado === 'sin_factura'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {g.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]">
                      {factura?.ocrData?.proveedor || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {gastos.length > 10 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
            ... y {gastos.length - 10} registros más
          </div>
        )}
      </div>
    </div>
  );
}

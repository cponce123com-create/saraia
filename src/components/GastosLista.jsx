import { Camera, CheckCircle, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { formatFecha, formatFechaCorta } from '../utils/formatFecha';

export default function GastosLista({ gastos, onAdjuntarFactura, onVerFactura, onEliminar }) {
  if (!gastos || gastos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg font-medium">No hay gastos aún</p>
        <p className="text-sm mt-1">Sube un reporte YAPE para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Factura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gastos.map((gasto) => (
              <tr key={gasto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">{formatFecha(gasto.fecha)}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium truncate max-w-[250px]">{gasto.descripcion}</p>
                </td>
                <td className={`px-4 py-3 text-sm font-semibold text-right ${gasto.tipo === 'gasto' ? 'text-red-600' : 'text-green-600'}`}>
                  {gasto.tipo === 'gasto' ? '-' : '+'} S/ {gasto.monto.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">{getEstadoBadge(gasto.estado)}</td>
                <td className="px-4 py-3 text-center">
                  {gasto.facturaId ? (
                    <button onClick={() => onVerFactura?.(gasto)} className="text-xs text-blue-600 underline hover:text-blue-800">Ver factura</button>
                  ) : (
                    <button onClick={() => onAdjuntarFactura?.(gasto)} className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                      <Camera size={14} /> Adjuntar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile: Cards optimizados táctiles */}
      <div className="md:hidden space-y-2.5">
        {gastos.map((gasto) => (
          <div key={gasto.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:bg-gray-50 transition-colors">
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight truncate">{gasto.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatFechaCorta(gasto.fecha)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${gasto.tipo === 'gasto' ? 'text-red-600' : 'text-green-600'}`}>
                    {gasto.tipo === 'gasto' ? '-' : '+'} S/ {gasto.monto.toFixed(2)}
                  </p>
                  <div className="mt-1.5">{getEstadoBadge(gasto.estado)}</div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50/50 flex">
              <div className="flex-1">
                {gasto.facturaId ? (
                  <button onClick={() => onVerFactura?.(gasto)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-blue-600 font-medium active:bg-blue-50 transition-colors">
                    <CheckCircle size={16} /> Ver factura
                  </button>
                ) : (
                  <button onClick={() => onAdjuntarFactura?.(gasto)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 font-medium active:bg-blue-50 transition-colors">
                    <Camera size={16} /> Adjuntar
                  </button>
                )}
              </div>
              {onEliminar && (
                <button onClick={() => onEliminar(gasto.id)} className="px-3 flex items-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors border-l border-gray-100" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEstadoBadge(estado) {
  const styles = {
    pendiente: 'bg-gray-100 text-gray-600',
    verificado: 'bg-green-100 text-green-700',
    conflicto: 'bg-orange-100 text-orange-700',
    sin_factura: 'bg-red-100 text-red-700',
  };

  const icons = {
    pendiente: null,
    verificado: CheckCircle,
    conflicto: AlertTriangle,
    sin_factura: XCircle,
  };

  const labels = {
    pendiente: 'Pendiente',
    verificado: 'Verificado',
    conflicto: 'Conflicto',
    sin_factura: 'Sin factura',
  };

  const Icon = icons[estado];
  const style = styles[estado] || styles.pendiente;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${style}`}>
      {Icon && <Icon size={12} />}
      {labels[estado] || estado}
    </span>
  );
}

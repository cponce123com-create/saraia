import { Camera, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import useGastosStore from '../store/gastosStore';

export default function GastosLista({ gastos, onAdjuntarFactura, onVerFactura }) {
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
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-PE')}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium truncate max-w-[250px]">{gasto.descripcion}</p>
                </td>
                <td className={`px-4 py-3 text-sm font-semibold text-right ${gasto.tipo === 'gasto' ? 'text-red-600' : 'text-green-600'}`}>
                  {gasto.tipo === 'gasto' ? '-' : '+'} S/ {gasto.monto.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">{getEstadoBadge(gasto.estado)}</td>
                <td className="px-4 py-3 text-center">
                  {gasto.facturaId ? (
                    <button
                      onClick={() => onVerFactura?.(gasto)}
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Ver factura
                    </button>
                  ) : (
                    <button
                      onClick={() => onAdjuntarFactura?.(gasto)}
                      className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Camera size={14} />
                      Adjuntar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {gastos.map((gasto) => (
          <div key={gasto.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{gasto.descripcion}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-PE')}
                </p>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-semibold ${gasto.tipo === 'gasto' ? 'text-red-600' : 'text-green-600'}`}>
                  {gasto.tipo === 'gasto' ? '-' : '+'} S/ {gasto.monto.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>{getEstadoBadge(gasto.estado)}</div>
              {gasto.facturaId ? (
                <button
                  onClick={() => onVerFactura?.(gasto)}
                  className="text-xs text-blue-600 underline"
                >
                  Ver factura
                </button>
              ) : (
                <button
                  onClick={() => onAdjuntarFactura?.(gasto)}
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg"
                >
                  <Camera size={14} />
                  Adjuntar
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

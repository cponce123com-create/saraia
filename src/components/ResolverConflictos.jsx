import { useState } from 'react';
import { Check, X, Search } from 'lucide-react';
import useGastosStore from '../store/gastosStore';

export default function ResolverConflictos() {
  const { facturas, gastos, asignarFactura, actualizarEstado } = useGastosStore();
  const [busqueda, setBusqueda] = useState({});

  // Facturas en conflicto o sin asignar
  const conflictos = facturas.filter(
    (f) => f.matchStatus === 'conflicto' || f.matchStatus === 'sin_match'
  );

  // Gastos pendientes disponibles para asignar
  const gastosPendientes = gastos.filter(
    (g) => g.estado !== 'verificado' && g.estado !== 'sin_factura'
  );

  if (conflictos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <p className="text-xl font-semibold text-gray-900">Todo resuelto</p>
        <p className="text-sm text-gray-500 mt-1">No hay conflictos pendientes de asignación</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {conflictos.length} factura{conflictos.length !== 1 ? 's' : ''} pendiente{conflictos.length !== 1 ? 's' : ''} de asignación
      </p>

      {conflictos.map((factura) => {
        const gastoActual = gastos.find((g) => g.id === factura.gastoId);
        const candidatos = factura.candidatos
          ? factura.candidatos.map((id) => gastos.find((g) => g.id === id)).filter(Boolean)
          : [];

        return (
          <div key={factura.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Imagen */}
              <div className="md:w-40 shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200">
                <img
                  src={`data:${factura.imageMime};base64,${factura.imageBase64}`}
                  alt="Factura"
                  className="w-full h-40 md:h-full object-cover"
                />
              </div>

              {/* Datos OCR */}
              <div className="flex-1 p-4 space-y-2 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{factura.ocrData?.proveedor || 'Sin proveedor'}</p>
                    {factura.ocrData?.fecha && (
                      <p className="text-gray-500">Fecha: {factura.ocrData.fecha}</p>
                    )}
                    {factura.ocrData?.monto && (
                      <p className="text-gray-500">Monto: S/ {factura.ocrData.monto.toFixed(2)}</p>
                    )}
                    {factura.ocrData?.ruc && (
                      <p className="text-gray-500">RUC: {factura.ocrData.ruc}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    factura.matchStatus === 'conflicto' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {factura.matchStatus === 'conflicto' ? 'Conflicto' : 'Sin asignar'}
                  </span>
                </div>

                {/* Gasto actual (si tiene) */}
                {gastoActual && (
                  <div className="bg-blue-50 rounded-lg p-2.5 mt-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Asignado actualmente</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{gastoActual.descripcion}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(gastoActual.fecha + 'T00:00:00').toLocaleDateString('es-PE')} · S/ {gastoActual.monto.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          asignarFactura(factura.id, gastoActual.id);
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Check size={14} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}

                {/* Candidatos sugeridos */}
                {candidatos.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Candidatos sugeridos</p>
                    <div className="space-y-2">
                      {candidatos.map((g) => (
                        <div key={g.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.descripcion}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-PE')} · S/ {g.monto.toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              asignarFactura(factura.id, g.id);
                            }}
                            className="ml-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-1"
                          >
                            <Check size={14} /> Asignar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buscador de otro gasto */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar otro gasto..."
                      value={busqueda[factura.id] || ''}
                      onChange={(e) =>
                        setBusqueda((prev) => ({ ...prev, [factura.id]: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {busqueda[factura.id] && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {gastosPendientes
                        .filter((g) =>
                          g.descripcion
                            .toLowerCase()
                            .includes(busqueda[factura.id].toLowerCase())
                        )
                        .slice(0, 5)
                        .map((g) => (
                          <div key={g.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{g.descripcion}</p>
                              <p className="text-xs text-gray-400">S/ {g.monto.toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => asignarFactura(factura.id, g.id)}
                              className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Asignar
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Marcar como sin factura */}
                <button
                  onClick={() => {
                    if (factura.gastoId) {
                      actualizarEstado(factura.gastoId, 'sin_factura');
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 underline mt-2 block"
                >
                  Marcar como "Sin factura"
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

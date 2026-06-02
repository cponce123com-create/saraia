import { X } from 'lucide-react';
import type { ComprobanteModalProps } from '../types';

export default function ComprobanteModal({ factura, onClose }: ComprobanteModalProps) {
  if (!factura) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Factura</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Imagen */}
          {factura.imageBase64 && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={`data:${factura.imageMime};base64,${factura.imageBase64}`}
                alt="Factura"
                className="w-full h-auto max-h-96 object-contain bg-gray-100"
              />
            </div>
          )}

          {/* Datos OCR */}
          {factura.ocrData && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              {factura.ocrData.proveedor && (
                <p>
                  <span className="text-gray-500">Proveedor:</span>{' '}
                  <span className="font-medium">{factura.ocrData.proveedor}</span>
                </p>
              )}
              {factura.ocrData.fecha && (
                <p>
                  <span className="text-gray-500">Fecha:</span>{' '}
                  <span className="font-medium">{factura.ocrData.fecha}</span>
                </p>
              )}
              {factura.ocrData.monto != null && (
                <p>
                  <span className="text-gray-500">Monto:</span>{' '}
                  <span className="font-semibold">S/ {factura.ocrData.monto.toFixed(2)}</span>
                </p>
              )}
              {factura.ocrData.ruc && (
                <p>
                  <span className="text-gray-500">RUC:</span> <span className="font-medium">{factura.ocrData.ruc}</span>
                </p>
              )}
              {factura.ocrData.tipo_comprobante && (
                <p>
                  <span className="text-gray-500">Tipo:</span>{' '}
                  <span className="font-medium capitalize">{factura.ocrData.tipo_comprobante}</span>
                </p>
              )}
              {factura.ocrData.numero_comprobante && (
                <p>
                  <span className="text-gray-500">N°:</span>{' '}
                  <span className="font-medium">{factura.ocrData.numero_comprobante}</span>
                </p>
              )}
              <p>
                <span className="text-gray-500">Estado:</span>{' '}
                <span
                  className={`font-medium ${
                    factura.matchStatus === 'auto'
                      ? 'text-green-600'
                      : factura.matchStatus === 'conflicto'
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {factura.matchStatus === 'auto'
                    ? 'Match automático'
                    : factura.matchStatus === 'conflicto'
                      ? 'Conflicto'
                      : 'Sin match'}
                </span>
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

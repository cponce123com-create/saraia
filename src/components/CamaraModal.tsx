import { useState, useRef } from 'react';
import { X, Camera, ImageIcon, Loader2 } from 'lucide-react';
import useGastosStore from '../store/gastosStore';
import { useOCR } from '../hooks/useOCR';
import { encontrarMatch } from '../utils/matchingAlgorithm';
import { formatFecha } from '../utils/formatFecha';
import type { OCRData, MatchResult, CamaraModalProps } from '../types';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

export default function CamaraModal({ gasto, onClose }: CamaraModalProps) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [ocrResult, setOcrResult] = useState<OCRData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const { extraerDatos, extrayendo } = useOCR(DEEPSEEK_API_KEY);
  const { adjuntarFactura, gastos, actualizarEstado } = useGastosStore();

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const b64 = (e.target!.result as string).split(',')[1];
      setImageBase64(b64);
      setImageMime(file.type);
      setOcrResult(null);
      setMatchResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSource = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const procesarOCR = async () => {
    if (!imageBase64) return;
    const data = await extraerDatos(imageBase64, imageMime);
    if (!data) return;
    setOcrResult(data);

    const result = encontrarMatch(gastos, data);
    setMatchResult(result);

    if (result.match === 'unico') {
      const g = result.gastos[0];
      adjuntarFactura(g.id, {
        imageBase64,
        imageMime,
        ocrData: data,
        matchStatus: 'auto',
        matchScore: result.scores[0]?.score || 0,
        createdAt: new Date().toISOString(),
      });
      actualizarEstado(g.id, 'verificado');
    } else if (result.match === 'multiple') {
      const g = result.gastos.find((x) => x.id === gasto.id) || result.gastos[0];
      adjuntarFactura(g.id, {
        imageBase64,
        imageMime,
        ocrData: data,
        matchStatus: 'conflicto',
        candidatos: result.gastos.map((x) => x.id),
        createdAt: new Date().toISOString(),
      });
      actualizarEstado(g.id, 'conflicto');
    } else {
      adjuntarFactura(gasto.id, {
        imageBase64,
        imageMime,
        ocrData: data,
        matchStatus: 'sin_match',
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Adjuntar Factura</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">{gasto.descripcion}</p>
            <p className="text-gray-500">
              {formatFecha(gasto.fecha)} · S/ {gasto.monto.toFixed(2)}
            </p>
          </div>

          {!imageBase64 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center gap-2 bg-blue-600 text-white rounded-xl py-8 hover:bg-blue-700 transition-colors"
                >
                  <Camera size={32} />
                  <span className="font-semibold">Tomar Foto</span>
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="flex flex-col items-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-8 hover:bg-gray-200 border-2 border-dashed border-gray-300 transition-colors"
                >
                  <ImageIcon size={32} />
                  <span className="font-semibold">Subir Archivo</span>
                </button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSource}
                className="hidden"
              />
              <input ref={galleryRef} type="file" accept="image/*" onChange={handleSource} className="hidden" />
            </>
          ) : (
            <>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={`data:${imageMime};base64,${imageBase64}`}
                  alt="Preview"
                  className="w-full h-64 object-contain bg-gray-100"
                />
              </div>

              {!ocrResult ? (
                <button
                  onClick={procesarOCR}
                  disabled={extrayendo}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {extrayendo ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Analizando con IA...
                    </>
                  ) : (
                    'Procesar con IA'
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Datos extraídos</h3>
                  <div className="bg-green-50 rounded-lg p-3 text-sm space-y-1">
                    {ocrResult.proveedor && (
                      <p>
                        <span className="text-gray-500">Proveedor:</span> {ocrResult.proveedor}
                      </p>
                    )}
                    {ocrResult.fecha && (
                      <p>
                        <span className="text-gray-500">Fecha:</span> {ocrResult.fecha}
                      </p>
                    )}
                    {ocrResult.monto != null && (
                      <p>
                        <span className="text-gray-500">Monto:</span> S/ {ocrResult.monto.toFixed(2)}
                      </p>
                    )}
                    {ocrResult.ruc && (
                      <p>
                        <span className="text-gray-500">RUC:</span> {ocrResult.ruc}
                      </p>
                    )}
                    {ocrResult.tipo_comprobante && (
                      <p>
                        <span className="text-gray-500">Tipo:</span> {ocrResult.tipo_comprobante}
                      </p>
                    )}
                  </div>

                  {matchResult && (
                    <div
                      className={`rounded-lg p-3 text-sm ${matchResult.match === 'unico' ? 'bg-green-100' : matchResult.match === 'multiple' ? 'bg-orange-100' : 'bg-yellow-100'}`}
                    >
                      {matchResult.match === 'unico' ? (
                        <p className="text-green-800 font-medium">
                          ✓ Match automático con: <strong>{matchResult.gastos[0].descripcion}</strong>
                        </p>
                      ) : matchResult.match === 'multiple' ? (
                        <div>
                          <p className="text-orange-800 font-medium mb-2">⚠️ Múltiples candidatos</p>
                          {matchResult.gastos.slice(0, 3).map((g) => (
                            <p key={g.id} className="text-orange-700 text-xs">
                              {g.descripcion} · S/ {g.monto.toFixed(2)}
                            </p>
                          ))}
                          <p className="text-orange-700 text-xs mt-1">Ve a &quot;Resolver&quot; para asignar manualmente.</p>
                        </div>
                      ) : (
                        <p className="text-yellow-800 font-medium">
                          📄 Sin match automático. Asignado al gasto actual.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700"
                  >
                    Listo
                  </button>
                </div>
              )}

              {!ocrResult && (
                <button
                  onClick={() => {
                    setImageBase64(null);
                    setOcrResult(null);
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Cambiar imagen
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

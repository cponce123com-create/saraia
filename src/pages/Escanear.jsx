import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Check, AlertTriangle, Eye } from 'lucide-react';
import useGastosStore from '../store/gastosStore';
import { useOCR } from '../hooks/useOCR';
import { encontrarMatch } from '../utils/matchingAlgorithm';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

export default function Escanear() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [verImagen, setVerImagen] = useState(null);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const { extraerDatos, extrayendo } = useOCR(DEEPSEEK_API_KEY);
  const {
    gastos,
    adjuntarFactura,
    actualizarEstado,
    facturas,
    asignarFactura,
    getFactura,
  } = useGastosStore();

  // Agregar imágenes desde input file
  function handleFiles(fileList) {
    const nuevos = Array.from(fileList).map((file, i) => ({
      id: Date.now() + i,
      file,
      mime: file.type || 'image/jpeg',
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...nuevos].slice(0, 20));

    // Limpiar el input para permitir re-seleccionar los mismos archivos
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  // Eliminar una imagen
  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  // Procesar todas las imágenes
  async function procesarTodo() {
    if (images.length === 0) return;

    setProcessing(true);
    const resultsArr = [];

    for (const img of images) {
      try {
        // 1. Convertir a base64
        const b64 = await fileToBase64(img.file);

        // 2. OCR con Gemini
        const ocrData = await extraerDatos(b64, img.mime);

        if (!ocrData) {
          resultsArr.push({
            imagen: img,
            ocr: null,
            match: null,
            status: 'error_ocr',
            error: 'No se pudo extraer datos de la imagen',
          });
          continue;
        }

        // 3. Matching con gastos pendientes
        const matchResult = encontrarMatch(gastos, ocrData);

        let status = 'sin_match';
        let gastoAsignado = null;

        if (matchResult.match === 'unico') {
          status = 'auto';
          gastoAsignado = matchResult.gastos[0];

          // Asignar factura automáticamente
          adjuntarFactura(gastoAsignado.id, {
            imageBase64: b64,
            imageMime: img.mime,
            ocrData,
            matchStatus: 'auto',
            matchScore: matchResult.scores[0]?.score || 0,
            createdAt: new Date().toISOString(),
          });
          actualizarEstado(gastoAsignado.id, 'verificado');

        } else if (matchResult.match === 'multiple') {
          status = 'conflicto';
          // No asignar automáticamente, guardar como pendiente
          // Adjuntar al primer candidato temporalmente
          const primerCandidato = matchResult.gastos[0];
          adjuntarFactura(primerCandidato.id, {
            imageBase64: b64,
            imageMime: img.mime,
            ocrData,
            matchStatus: 'conflicto',
            candidatos: matchResult.gastos.map((g) => g.id),
            createdAt: new Date().toISOString(),
          });
          actualizarEstado(primerCandidato.id, 'conflicto');
        }

        resultsArr.push({
          imagen: img,
          ocr: ocrData,
          match: matchResult,
          status,
          gastoAsignado: matchResult.match === 'unico' ? matchResult.gastos[0] : null,
        });

      } catch (err) {
        resultsArr.push({
          imagen: img,
          ocr: null,
          match: null,
          status: 'error',
          error: err.message,
        });
      }
    }

    setResults(resultsArr);
    setProcessing(false);
  }

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = e.target.result.split(',')[1];
        resolve(b64);
      };
      reader.readAsDataURL(file);
    });
  }

  function reiniciar() {
    setImages([]);
    setResults(null);
  }

  // Resumen de resultados
  const autoAsignadas = results ? results.filter((r) => r.status === 'auto').length : 0;
  const conflictos = results ? results.filter((r) => r.status === 'conflicto').length : 0;
  const sinMatch = results ? results.filter((r) => r.status === 'sin_match').length : 0;
  const errores = results ? results.filter((r) => r.status === 'error_ocr' || r.status === 'error').length : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold mb-2">📸 Escáner Masivo de Facturas</h1>
        <p className="text-blue-100 text-sm">
          Toma o selecciona varias fotos de tus boletas, facturas y recibos.
          La IA extraerá los datos y los asignará automáticamente a los pagos correctos.
        </p>
      </div>

      {!results ? (
        <>
          {/* Botones de captura */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50"
            >
              <Camera size={40} className="text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">📷 Tomar Fotos</p>
                <p className="text-xs text-gray-500">Usa la cámara trasera</p>
              </div>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50"
            >
              <ImageIcon size={40} className="text-blue-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">🖼️ Seleccionar</p>
                <p className="text-xs text-gray-500">Desde la galería</p>
              </div>
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Grid de previsualización */}
          {images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">
                  {images.length} foto{images.length !== 1 ? 's' : ''} seleccionada{images.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setImages([])}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={procesarTodo}
                disabled={processing}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Procesando {images.length} imágenes con IA...
                  </>
                ) : (
                  `🚀 PROCESAR ${images.length} FACTURA${images.length !== 1 ? 'S' : ''}`
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        /* Resultados */
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <Check size={24} className="mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-700">{autoAsignadas}</p>
                <p className="text-xs text-green-600">Asignadas</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <AlertTriangle size={24} className="mx-auto text-orange-600 mb-1" />
                <p className="text-2xl font-bold text-orange-700">{conflictos}</p>
                <p className="text-xs text-orange-600">En conflicto</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <ImageIcon size={24} className="mx-auto text-yellow-600 mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{sinMatch}</p>
                <p className="text-xs text-yellow-600">Sin match</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <X size={24} className="mx-auto text-red-600 mb-1" />
                <p className="text-2xl font-bold text-red-700">{errores}</p>
                <p className="text-xs text-red-600">Errores</p>
              </div>
            </div>
          </div>

          {/* Lista de resultados por imagen */}
          {results.map((r, i) => (
            <div key={r.imagen.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex">
                {/* Miniatura */}
                <div
                  className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-gray-100 cursor-pointer border-r border-gray-200"
                  onClick={() => setVerImagen(r.imagen.preview)}
                >
                  <img src={r.imagen.preview} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Datos */}
                <div className="flex-1 p-3 sm:p-4 space-y-1 text-sm min-w-0">
                  {/* Estado */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'auto' ? 'bg-green-100 text-green-700' :
                      r.status === 'conflicto' ? 'bg-orange-100 text-orange-700' :
                      r.status === 'sin_match' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'auto' ? '✓ Asignado automático' :
                       r.status === 'conflicto' ? '⚠️ Conflicto' :
                       r.status === 'sin_match' ? '📄 Sin match' :
                       '❌ Error'}
                    </span>
                  </div>

                  {/* Datos OCR */}
                  {r.ocr && (
                    <div className="space-y-0.5">
                      {r.ocr.proveedor && (
                        <p className="truncate"><span className="text-gray-500">Proveedor:</span> <strong>{r.ocr.proveedor}</strong></p>
                      )}
                      {r.ocr.fecha && (
                        <p><span className="text-gray-500">Fecha:</span> {r.ocr.fecha}</p>
                      )}
                      {r.ocr.monto && (
                        <p><span className="text-gray-500">Monto:</span> <strong className="text-green-700">S/ {r.ocr.monto.toFixed(2)}</strong></p>
                      )}
                      {r.ocr.ruc && (
                        <p className="truncate"><span className="text-gray-500">RUC:</span> {r.ocr.ruc}</p>
                      )}
                      {r.ocr.tipo_comprobante && (
                        <p><span className="text-gray-500">Tipo:</span> {r.ocr.tipo_comprobante}</p>
                      )}
                    </div>
                  )}

                  {/* Match encontrado */}
                  {r.gastoAsignado && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Asignado a:</p>
                      <p className="font-medium text-blue-700 truncate">{r.gastoAsignado.descripcion}</p>
                      <p className="text-xs text-gray-500">
                        {r.gastoAsignado.fecha} · S/ {r.gastoAsignado.monto.toFixed(2)}
                        {r.match?.scores?.[0]?.score && (
                          <span className="ml-1 text-green-600">({(r.match.scores[0].score * 100).toFixed(0)}% match)</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Candidatos en conflicto */}
                  {r.status === 'conflicto' && r.match?.gastos && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Candidatos:</p>
                      {r.match.gastos.slice(0, 3).map((g, j) => (
                        <div key={g.id} className="flex items-center justify-between text-xs">
                          <span className="truncate">{g.descripcion}</span>
                          <button
                            onClick={() => {
                              // Asignar manualmente a este candidato
                              const factura = facturas.find((f) => f.gastoId === r.match.gastos[0].id && f.matchStatus === 'conflicto');
                              if (factura) {
                                asignarFactura(factura.id, g.id);
                              }
                            }}
                            className="ml-2 text-blue-600 underline text-[11px]"
                          >
                            Asignar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              onClick={reiniciar}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Escanear más fotos
            </button>
          </div>
        </div>
      )}

      {/* Modal ver imagen */}
      {verImagen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setVerImagen(null)}>
          <img src={verImagen} alt="" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

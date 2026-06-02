import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Check, AlertTriangle, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import useGastosStore from '../store/gastosStore';
import { encontrarMatch } from '../utils/matchingAlgorithm';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

export default function Escanear() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [verImagen, setVerImagen] = useState(null);
  const [editando, setEditando] = useState(null); // index de la imagen en edición manual

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const { gastos, adjuntarFactura, actualizarEstado, facturas, asignarFactura } = useGastosStore();

  function handleFiles(fileList) {
    const nuevos = Array.from(fileList).map((file, i) => ({
      id: Date.now() + i,
      file,
      mime: file.type || 'image/jpeg',
      preview: URL.createObjectURL(file),
      b64: null,
    }));
    setImages((prev) => [...prev, ...nuevos].slice(0, 20));
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  // Convertir file a base64
  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  // Intentar OCR con DeepSeek
  async function intentarOCR(b64, mimeType) {
    if (!DEEPSEEK_API_KEY) return null;

    try {
      const dataUri = `data:${mimeType};base64,${b64}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `Extract invoice data from this image. Return ONLY valid JSON: {"fecha":"YYYY-MM-DD"|null,"monto":number|null,"proveedor":string|null,"ruc":string|null,"tipo_comprobante":"boleta"|"factura"|"ticket"|null,"numero_comprobante":string|null}` },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Respuesta sin JSON');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado');
      throw err;
    }
  }

  // Procesar una imagen con o sin IA
  async function procesarImagen(img) {
    const b64 = img.b64 || await fileToBase64(img.file);
    let ocrData = null;
    let errorMsg = null;

    // Intentar IA
    if (DEEPSEEK_API_KEY) {
      try {
        ocrData = await intentarOCR(b64, img.mime);
      } catch (err) {
        errorMsg = err.message;
        console.warn('OCR falló, modo manual disponible:', err.message);
      }
    }

    // Matching
    let status = 'sin_match';
    let gastoAsignado = null;
    let matchResult = null;

    if (ocrData) {
      matchResult = encontrarMatch(gastos, ocrData);

      if (matchResult.match === 'unico') {
        status = 'auto';
        gastoAsignado = matchResult.gastos[0];
        adjuntarFactura(gastoAsignado.id, {
          imageBase64: b64, imageMime: img.mime, ocrData,
          matchStatus: 'auto', matchScore: matchResult.scores[0]?.score || 0,
          createdAt: new Date().toISOString(),
        });
        actualizarEstado(gastoAsignado.id, 'verificado');
      } else if (matchResult.match === 'multiple') {
        status = 'conflicto';
        const pc = matchResult.gastos[0];
        adjuntarFactura(pc.id, {
          imageBase64: b64, imageMime: img.mime, ocrData,
          matchStatus: 'conflicto', candidatos: matchResult.gastos.map((g) => g.id),
          createdAt: new Date().toISOString(),
        });
        actualizarEstado(pc.id, 'conflicto');
      }
    }

    return { imagen: img, ocr: ocrData, match: matchResult, status, gastoAsignado, error: errorMsg, b64 };
  }

  async function procesarTodo() {
    if (images.length === 0) return;
    setProcessing(true);

    const resultsArr = [];
    for (const img of images) {
      try {
        const r = await procesarImagen(img);
        resultsArr.push(r);
      } catch (err) {
        resultsArr.push({
          imagen: img, ocr: null, match: null, status: 'error',
          error: err.message, b64: null,
        });
      }
    }

    setResults(resultsArr);
    setProcessing(false);
  }

  // Asignar manualmente datos OCR
  function asignarDatosManuales(index, datos) {
    setResults((prev) => {
      const nuevos = [...prev];
      const item = { ...nuevos[index] };

      // Buscar match con los datos manuales
      const matchResult = encontrarMatch(gastos, datos);
      let status = 'sin_match';
      let gastoAsignado = null;

      if (matchResult.match === 'unico') {
        status = 'auto';
        gastoAsignado = matchResult.gastos[0];
        adjuntarFactura(gastoAsignado.id, {
          imageBase64: item.b64, imageMime: item.imagen.mime, ocrData: datos,
          matchStatus: 'manual',
          createdAt: new Date().toISOString(),
        });
        actualizarEstado(gastoAsignado.id, 'verificado');
      }

      nuevos[index] = { ...item, ocr: datos, match: matchResult, status, gastoAsignado, error: null };
      return nuevos;
    });
    setEditando(null);
    toast.success('Datos guardados y matching ejecutado');
  }

  const autoAsignadas = results ? results.filter((r) => r.status === 'auto').length : 0;
  const conflictos = results ? results.filter((r) => r.status === 'conflicto').length : 0;
  const sinMatch = results ? results.filter((r) => r.status === 'sin_match').length : 0;
  const errores = results ? results.filter((r) => r.status === 'error_ocr' || r.status === 'error').length : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold mb-2">📸 Escáner Masivo de Facturas</h1>
        <p className="text-blue-100 text-sm">
          Toma o selecciona fotos. La IA intentará extraer los datos.
          Si falla, puedes ingresarlos manualmente.
        </p>
      </div>

      {!results ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => cameraRef.current?.click()} disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50">
              <Camera size={40} className="text-blue-600" />
              <p className="font-semibold text-gray-900">📷 Tomar Fotos</p>
              <p className="text-xs text-gray-500">Cámara trasera</p>
            </button>
            <button onClick={() => galleryRef.current?.click()} disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50">
              <ImageIcon size={40} className="text-blue-600" />
              <p className="font-semibold text-gray-900">🖼️ Seleccionar</p>
              <p className="text-xs text-gray-500">Desde galería</p>
            </button>
          </div>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />

          {!DEEPSEEK_API_KEY && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <strong>⚠️ Sin API Key.</strong> Las fotos se procesarán sin IA — deberás ingresar los datos manualmente.
              Crea un archivo <code>.env</code> con <code>VITE_DEEPSEEK_API_KEY=sk-tu_key</code> o agrégalo en Render.
            </div>
          )}

          {images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{images.length} foto{images.length !== 1 ? 's' : ''}</h3>
                <button onClick={() => setImages([])} className="text-xs text-red-500">Limpiar</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={procesarTodo} disabled={processing}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {processing ? <><Loader2 size={20} className="animate-spin" /> Procesando...</>
                  : `🚀 PROCESAR ${images.length} FACTURA${images.length !== 1 ? 'S' : ''}`}
              </button>
            </div>
          )}
        </>
      ) : (
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
                <Edit3 size={24} className="mx-auto text-yellow-600 mb-1" />
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

          {/* Resultados por imagen */}
          {results.map((r, idx) => (
            <div key={r.imagen.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Miniatura */}
                <div className="sm:w-32 sm:h-32 shrink-0 bg-gray-100 cursor-pointer border-b sm:border-b-0 sm:border-r flex items-center justify-center"
                  onClick={() => setVerImagen(r.imagen.preview)}>
                  <img src={r.imagen.preview} alt="" className="w-full h-32 sm:h-full object-cover" />
                </div>

                <div className="flex-1 p-3 sm:p-4 text-sm min-w-0">
                  {/* Estado + Error */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'auto' ? 'bg-green-100 text-green-700' : r.status === 'conflicto' ? 'bg-orange-100 text-orange-700' : r.status === 'sin_match' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status === 'auto' ? '✓ Asignado' : r.status === 'conflicto' ? '⚠️ Conflicto' : r.status === 'sin_match' ? '📄 Sin match' : '❌ Error'}
                    </span>
                    {r.error && !r.ocr && (
                      <button onClick={() => setEditando(idx)} className="text-blue-600 underline text-xs flex items-center gap-1">
                        <Edit3 size={12} /> Ingresar manual
                      </button>
                    )}
                  </div>

                  {/* Modo edición manual */}
                  {editando === idx ? (
                    <FormManual onSubmit={(datos) => asignarDatosManuales(idx, datos)}
                      onCancel={() => setEditando(null)} />
                  ) : (
                    <>
                      {/* Datos OCR */}
                      {r.ocr ? (
                        <div className="space-y-0.5">
                          {r.ocr.proveedor && <p><span className="text-gray-500">Proveedor:</span> <strong>{r.ocr.proveedor}</strong></p>}
                          {r.ocr.fecha && <p><span className="text-gray-500">Fecha:</span> {r.ocr.fecha}</p>}
                          {r.ocr.monto && <p><span className="text-gray-500">Monto:</span> <strong className="text-green-700">S/ {r.ocr.monto.toFixed(2)}</strong></p>}
                          {r.ocr.ruc && <p><span className="text-gray-500">RUC:</span> {r.ocr.ruc}</p>}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs">{r.error || 'Sin datos'}</p>
                      )}

                      {/* Match */}
                      {r.gastoAsignado && (
                        <div className="mt-2 pt-2 border-t text-xs">
                          <p className="text-gray-500 uppercase font-semibold">Asignado a:</p>
                          <p className="font-medium text-blue-700 truncate">{r.gastoAsignado.descripcion}</p>
                          <p className="text-gray-500">
                            {r.gastoAsignado.fecha} · S/ {r.gastoAsignado.monto.toFixed(2)}
                            {r.match?.scores?.[0]?.score && <span className="ml-1 text-green-600">({(r.match.scores[0].score * 100).toFixed(0)}%)</span>}
                          </p>
                        </div>
                      )}

                      {/* Candidatos conflicto */}
                      {r.status === 'conflicto' && r.match?.gastos?.slice(0, 3).map((g) => (
                        <div key={g.id} className="flex items-center justify-between text-xs mt-1">
                          <span className="truncate">{g.descripcion}</span>
                          <button onClick={() => {
                            const f = facturas.find((fa) => fa.matchStatus === 'conflicto' && fa.gastoId === r.match.gastos[0]?.id);
                            if (f) { asignarFactura(f.id, g.id); toast.success('Asignado'); }
                          }} className="ml-2 text-blue-600 underline">Asignar</button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => { setResults(null); setImages([]); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">
            Escanear más fotos
          </button>
        </div>
      )}

      {verImagen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setVerImagen(null)}>
          <img src={verImagen} alt="" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ─── Formulario de ingreso manual ───────────────────────────────────────────
function FormManual({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ proveedor: '', fecha: '', monto: '', ruc: '', tipo: 'factura', numero: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      proveedor: form.proveedor || null,
      fecha: form.fecha || null,
      monto: form.monto ? parseFloat(form.monto) : null,
      ruc: form.ruc || null,
      tipo_comprobante: form.tipo || null,
      numero_comprobante: form.numero || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input value={form.proveedor} onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
        placeholder="Proveedor *" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
          placeholder="Fecha" className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          placeholder="Monto S/ *" className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <input value={form.ruc} onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
        placeholder="RUC (opcional)" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex gap-2">
        <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm outline-none">
          <option value="factura">Factura</option>
          <option value="boleta">Boleta</option>
          <option value="ticket">Ticket</option>
          <option value="otro">Otro</option>
        </select>
        <input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
          placeholder="N° comprobante" className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Guardar y buscar match
        </button>
        <button type="button" onClick={onCancel} className="px-4 text-gray-500 text-sm hover:text-gray-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}

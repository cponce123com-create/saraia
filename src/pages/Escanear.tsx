import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, AlertTriangle, Edit3 as Edit3Icon } from 'lucide-react';
import toast from 'react-hot-toast';
import useGastosStore from '../store/gastosStore';
import { encontrarMatch } from '../utils/matchingAlgorithm';
import type { OCRData, MatchResult, Gasto } from '../types';

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

interface ImageEntry {
  id: number;
  file: File;
  mime: string;
  preview: string;
  b64: string | null;
}

interface ResultEntry {
  imagen: ImageEntry;
  ocr: OCRData | null;
  match: MatchResult | null;
  status: string;
  gastoAsignado: Gasto | null;
  error: string | null;
  b64: string;
}

export default function Escanear() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultEntry[] | null>(null);
  const [verImagen, setVerImagen] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const { gastos, adjuntarFactura, actualizarEstado, facturas, asignarFactura } = useGastosStore();

  function handleFiles(fileList: FileList) {
    const nuevos: ImageEntry[] = Array.from(fileList).map((file, i) => ({
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

  function removeImage(id: number) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => resolve((e.target!.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  async function procesarTodo() {
    if (images.length === 0) return;
    setProcessing(true);
    const resultsArr: ResultEntry[] = [];

    for (const img of images) {
      const b64 = img.b64 || (await fileToBase64(img.file));
      let ocrData: OCRData | null = null;
      let errorMsg: string | null = null;

      if (API_KEY) {
        try {
          const dataUri = 'data:' + img.mime + ';base64,' + b64;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const response = await fetch('https://api.deepseek.com/chat/completions', {
            signal: controller.signal,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Extract invoice data from this image. Return ONLY JSON: {"fecha":"YYYY-MM-DD"|null,"monto":number|null,"proveedor":string|null,"ruc":string|null}',
                    },
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
            throw new Error(err.error ? err.error.message : 'HTTP ' + response.status);
          }
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || '';
          const jsonMatch = text.match(/{[\s\S]*}/);
          if (jsonMatch) ocrData = JSON.parse(jsonMatch[0]) as OCRData;
        } catch (err) {
          errorMsg = err instanceof Error ? err.message : String(err);
          if (err instanceof TypeError && err.message.includes('fetch')) {
            errorMsg = 'DeepSeek bloqueado por CORS. Ingresa los datos manualmente.';
          }
        }
      } else {
        errorMsg = 'API Key no configurada';
      }

      let status = 'sin_match';
      let gastoAsignado: Gasto | null = null;
      let matchResult: MatchResult | null = null;

      if (ocrData) {
        matchResult = encontrarMatch(gastos, ocrData);
        if (matchResult.match === 'unico') {
          status = 'auto';
          gastoAsignado = matchResult.gastos[0];
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
          const pc = matchResult.gastos[0];
          adjuntarFactura(pc.id, {
            imageBase64: b64,
            imageMime: img.mime,
            ocrData,
            matchStatus: 'conflicto',
            candidatos: matchResult.gastos.map((g) => g.id),
            createdAt: new Date().toISOString(),
          });
          actualizarEstado(pc.id, 'conflicto');
        }
      }

      resultsArr.push({
        imagen: img,
        ocr: ocrData,
        match: matchResult,
        status: ocrData ? status : 'manual',
        gastoAsignado,
        error: errorMsg,
        b64,
      });
    }

    setResults(resultsArr);
    setProcessing(false);
  }

  function asignarDatosManuales(idx: number, datos: OCRData) {
    const r = results![idx];
    if (!r) return;
    const matchResult = encontrarMatch(gastos, datos);
    let status = 'sin_match';
    let gastoAsignado: Gasto | null = null;
    if (matchResult.match === 'unico') {
      status = 'auto';
      gastoAsignado = matchResult.gastos[0];
      adjuntarFactura(gastoAsignado.id, {
        imageBase64: r.b64,
        imageMime: r.imagen.mime,
        ocrData: datos,
        matchStatus: 'manual',
        createdAt: new Date().toISOString(),
      });
      actualizarEstado(gastoAsignado.id, 'verificado');
    }
    setResults((prev) => {
      const n = [...prev!];
      n[idx] = { ...n[idx], ocr: datos, match: matchResult, status, gastoAsignado, error: null };
      return n;
    });
    toast.success('Datos guardados y matching ejecutado');
  }

  const autoCount = results ? results.filter((r) => r.status === 'auto').length : 0;
  const manualCount = results ? results.filter((r) => r.status === 'manual').length : 0;
  const conflictoCount = results ? results.filter((r) => r.status === 'conflicto').length : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold">Escaneo de Facturas</h1>
        <p className="text-blue-100 text-sm mt-1">Toma o sube fotos. Si la IA falla, ingresa los datos manualmente.</p>
      </div>

      {!API_KEY && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>API Key no configurada.</strong> Las facturas se procesaran en modo manual. Para activar OCR, agrega
          VITE_DEEPSEEK_API_KEY en Render.
        </div>
      )}

      {!results ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50"
            >
              <Camera size={40} className="text-blue-600" />
              <p className="font-semibold text-gray-900">Tomar Foto</p>
              <p className="text-xs text-gray-500">Camara trasera</p>
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={processing}
              className="flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 transition-colors disabled:opacity-50"
            >
              <ImageIcon size={40} className="text-blue-600" />
              <p className="font-semibold text-gray-900">Subir Foto</p>
              <p className="text-xs text-gray-500">Desde galeria</p>
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">
                  {images.length} foto{images.length !== 1 ? 's' : ''}
                </h3>
                <button onClick={() => setImages([])} className="text-xs text-red-500">
                  Limpiar
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border"
                  >
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={procesarTodo}
                disabled={processing}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {processing
                  ? 'Procesando...'
                  : 'PROCESAR ' + images.length + ' FOTO' + (images.length !== 1 ? 'S' : '')}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-lg p-3">
                <Check size={24} className="mx-auto text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-700">{autoCount}</p>
                <p className="text-xs text-green-600">Automaticas</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <Edit3Icon size={24} className="mx-auto text-yellow-600 mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{manualCount}</p>
                <p className="text-xs text-yellow-600">Manuales</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <AlertTriangle size={24} className="mx-auto text-orange-600 mb-1" />
                <p className="text-2xl font-bold text-orange-700">{conflictoCount}</p>
                <p className="text-xs text-orange-600">Conflictos</p>
              </div>
            </div>
          </div>

          {results.map((r, idx) => (
            <div key={r.imagen.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div
                  className="sm:w-32 sm:h-32 shrink-0 bg-gray-100 cursor-pointer border-b sm:border-b-0 sm:border-r"
                  onClick={() => setVerImagen(r.imagen.preview)}
                >
                  <img src={r.imagen.preview} alt="" className="w-full h-32 sm:h-full object-cover" />
                </div>
                <div className="flex-1 p-3 sm:p-4 text-sm min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={
                        'text-xs font-medium px-2 py-0.5 rounded-full ' +
                        (r.status === 'auto'
                          ? 'bg-green-100 text-green-700'
                          : r.status === 'conflicto'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700')
                      }
                    >
                      {r.status === 'auto'
                        ? 'Asignado automatico'
                        : r.status === 'conflicto'
                          ? 'Conflicto'
                          : 'Pendiente manual'}
                    </span>
                    {r.error && <span className="text-xs text-red-400">{r.error}</span>}
                  </div>

                  {r.ocr ? (
                    <div className="space-y-0.5">
                      {r.ocr.proveedor && (
                        <p>
                          <span className="text-gray-500">Proveedor:</span> <strong>{r.ocr.proveedor}</strong>
                        </p>
                      )}
                      {r.ocr.fecha && (
                        <p>
                          <span className="text-gray-500">Fecha:</span> {r.ocr.fecha}
                        </p>
                      )}
                      {r.ocr.monto != null && (
                        <p>
                          <span className="text-gray-500">Monto:</span>{' '}
                          <strong className="text-green-700">S/ {r.ocr.monto.toFixed(2)}</strong>
                        </p>
                      )}
                      {r.ocr.ruc && (
                        <p>
                          <span className="text-gray-500">RUC:</span> {r.ocr.ruc}
                        </p>
                      )}
                      {r.gastoAsignado && (
                        <div className="mt-1 pt-1 border-t text-xs">
                          <p className="text-gray-500">
                            Asignado a: <strong className="text-blue-700">{r.gastoAsignado.descripcion}</strong> - S/{' '}
                            {r.gastoAsignado.monto.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <FormManual
                      onSubmit={(datos: OCRData) => {
                        setProcessing(true);
                        asignarDatosManuales(idx, datos);
                        setProcessing(false);
                      }}
                    />
                  )}

                  {r.status === 'conflicto' &&
                    r.match?.gastos?.slice(0, 3).map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs mt-1">
                        <span className="truncate">
                          {g.descripcion} - S/ {g.monto.toFixed(2)}
                        </span>
                        <button
                          onClick={() => {
                            const f = facturas.find(
                              (fa) => fa.matchStatus === 'conflicto' && fa.gastoId === r.match!.gastos[0]?.id,
                            );
                            if (f) {
                              asignarFactura(f.id, g.id);
                              toast.success('Asignado');
                            }
                          }}
                          className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs"
                        >
                          Asignar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              setResults(null);
              setImages([]);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Escanear mas fotos
          </button>
        </div>
      )}

      {verImagen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setVerImagen(null)}
        >
          <img src={verImagen} alt="" className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

interface FormManualProps {
  onSubmit: (datos: OCRData) => void;
}

function FormManual({ onSubmit }: FormManualProps) {
  const [form, setForm] = useState({ proveedor: '', fecha: '', monto: '', ruc: '' });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proveedor || !form.monto) {
      toast.error('Proveedor y Monto son obligatorios');
      return;
    }
    onSubmit({
      proveedor: form.proveedor || null,
      fecha: form.fecha || null,
      monto: form.monto ? parseFloat(form.monto) : null,
      ruc: form.ruc || null,
      tipo_comprobante: 'factura',
      numero_comprobante: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
      <p className="text-xs font-semibold text-blue-800 uppercase">Ingresa los datos de la factura:</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={form.proveedor}
          onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
          placeholder="Proveedor *"
          className="col-span-2 border rounded-lg px-3 py-2 text-sm"
          required
        />
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
          placeholder="Fecha"
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.01"
          value={form.monto}
          onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          placeholder="Monto S/ *"
          className="border rounded-lg px-3 py-2 text-sm"
          required
        />
      </div>
      <input
        value={form.ruc}
        onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
        placeholder="RUC (opcional)"
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Buscar match con este gasto
      </button>
    </form>
  );
}

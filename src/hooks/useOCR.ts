import { useState } from 'react';
import toast from 'react-hot-toast';
import type { OCRData } from '../types';

const MAX_RETRIES = 4;
const BASE_DELAY = 2000; // 2s — total ~30s con backoff exponencial

/**
 * Hook para extraer datos de facturas usando DeepSeek-VL2 (visión).
 * La comunicación va a través del proxy serverless (/api/ocr)
 * para mantener la API key segura en el servidor.
 */
export function useOCR(): {
  extraerDatos: (imageBase64: string, mimeType?: string) => Promise<OCRData | null>;
  extrayendo: boolean;
} {
  const [extrayendo, setExtrayendo] = useState(false);

  const extraerDatos = async (
    imageBase64: string,
    mimeType: string = 'image/jpeg',
  ): Promise<OCRData | null> => {
    setExtrayendo(true);

    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mimeType }),
        });

        const body = await response.json();

        if (!response.ok) {
          lastError = body.error || `Error HTTP ${response.status}`;

          // Si es error de auth, no reintentar
          if (response.status === 401 || response.status === 403) break;
          // Si es error de validación, no reintentar
          if (response.status === 400) break;

          // Esperar con backoff exponencial antes de reintentar
          if (attempt < MAX_RETRIES - 1) {
            const delay = BASE_DELAY * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
          }
          continue;
        }

        return body as OCRData;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Error de conexión';
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // Todos los intentos fallaron
    const message = lastError || 'Error desconocido';
    toast.error(`Error de OCR: ${message}`);
    return null;
  };

  return { extraerDatos, extrayendo };
}

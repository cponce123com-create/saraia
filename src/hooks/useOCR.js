import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook para extraer datos de facturas usando Gemini API.
 * 
 * @param {string} apiKey - Gemini API Key
 */
export function useOCR(apiKey) {
  const [extrayendo, setExtrayendo] = useState(false);

  const extraerDatos = async (imageBase64, mimeType = 'image/jpeg') => {
    if (!apiKey) {
      toast.error('Configura la API Key de Gemini en Ajustes');
      return null;
    }

    setExtrayendo(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Eres un extractor de facturas peruanas. Busca RUC, fecha de emisión, monto total, nombre del proveedor. Devuelve SOLO JSON válido con el siguiente formato: { "fecha": "YYYY-MM-DD" | null, "monto": number | null, "proveedor": string | null, "ruc": string | null, "tipo_comprobante": "boleta" | "factura" | "ticket" | null, "numero_comprobante": string | null }' },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
              ]
            }]
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Error al llamar a Gemini');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      toast.error(`Error de OCR: ${err.message}`);
      return null;
    } finally {
      setExtrayendo(false);
    }
  };

  return { extraerDatos, extrayendo };
}

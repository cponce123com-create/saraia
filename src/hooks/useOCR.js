import { useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook para extraer datos de facturas usando DeepSeek-VL2 (visión).
 * 
 * @param {string} apiKey - DeepSeek API Key
 */
export function useOCR(apiKey) {
  const [extrayendo, setExtrayendo] = useState(false);

  const extraerDatos = async (imageBase64, mimeType = 'image/jpeg') => {
    if (!apiKey) {
      toast.error('Configura la API Key de DeepSeek en .env (VITE_DEEPSEEK_API_KEY)');
      return null;
    }

    setExtrayendo(true);
    try {
      const dataUri = `data:${mimeType};base64,${imageBase64}`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-vl2',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Eres un extractor de facturas peruanas. Busca RUC, fecha de emisión, monto total, nombre del proveedor. Devuelve SOLO JSON válido, sin markdown, sin explicación, con este formato exacto:
{
  "fecha": "YYYY-MM-DD" | null,
  "monto": number | null,
  "proveedor": string | null,
  "ruc": string | null,
  "tipo_comprobante": "boleta" | "factura" | "ticket" | null,
  "numero_comprobante": string | null
}`,
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUri },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      // Extraer JSON de la respuesta (puede venir con ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta de DeepSeek');
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

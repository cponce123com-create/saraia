/**
 * Serverless function para Vercel/Netlify.
 * Proxy seguro entre el frontend y DeepSeek API.
 * La API KEY vive solo en el servidor, nunca llega al frontend.
 */
export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('[API OCR] DEEPSEEK_API_KEY no configurada en el servidor');
    return res.status(500).json({ error: 'API key no configurada en el servidor' });
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 es requerido' });
  }

  const dataUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
      const status = response.status;
      let message = `Error HTTP ${status}`;

      if (status === 401) message = 'API key inválida';
      else if (status === 429) message = 'Cuota de API excedida. Intenta de nuevo en unos segundos.';
      else if (status >= 500) message = 'Error del servidor de DeepSeek. Intenta de nuevo.';
      else if (err.error?.message) message = err.error.message;

      return res.status(status).json({ error: message });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'No se pudo extraer JSON de la respuesta de DeepSeek' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[API OCR] Error:', err.message);
    return res.status(500).json({ error: 'Error de conexión con DeepSeek: ' + err.message });
  }
}

import { Router } from 'express';

const router = Router();

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

router.post('/', async (req, res) => {
  const origin = req.headers['origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada en el servidor' });
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 es requerido' });

  const dataUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-vl2',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un extractor de facturas peruanas. Busca RUC, fecha de emisi\u00f3n, monto total, nombre del proveedor. Devuelve SOLO JSON v\u00e1lido, sin markdown, sin explicaci\u00f3n, con este formato exacto:
{
  "fecha": "YYYY-MM-DD" | null,
  "monto": number | null,
  "proveedor": string | null,
  "ruc": string | null,
  "tipo_comprobante": "boleta" | "factura" | "ticket" | null,
  "numero_comprobante": string | null
}`,
              },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json().catch(() => ({}));
      const status = response.status;
      let message = `Error HTTP ${status}`;
      if (status === 401) message = 'API key inv\u00e1lida';
      else if (status === 429) message = 'Cuota de API excedida. Intenta de nuevo.';
      else if (status >= 500) message = 'Error del servidor de DeepSeek.';
      else if (err.error?.message) message = err.error.message;
      return res.status(status).json({ error: message });
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'No se pudo extraer JSON de la respuesta' });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    return res.status(500).json({ error: 'Error de conexi\u00f3n: ' + err.message });
  }
});

export default router;

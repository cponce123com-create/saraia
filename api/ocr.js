const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit simple por IP (en memoria, suficiente para serverless)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  if (!global._rl) global._rl = {};
  const entry = global._rl[ip] || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60000;
  }
  entry.count++;
  global._rl[ip] = entry;
  if (entry.count > 30) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
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
              { type: 'image_url', image_url: { url: dataUri } },
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
      else if (status === 429) message = 'Cuota de API excedida. Intenta de nuevo.';
      else if (status >= 500) message = 'Error del servidor de DeepSeek.';
      else if (err.error?.message) message = err.error.message;
      return res.status(status).json({ error: message });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'No se pudo extraer JSON de la respuesta' });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: 'Error de conexión: ' + err.message });
  }
}

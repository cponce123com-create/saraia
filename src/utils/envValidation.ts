let validated = false;

export function validateEnv(): { success: boolean; warnings?: string[] } {
  if (validated) return { success: true };

  const warnings: string[] = [];

  if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
    warnings.push(
      'VITE_DEEPSEEK_API_KEY no configurada. El OCR usara el proxy serverless (/api/ocr). ' +
        'Configura DEEPSEEK_API_KEY en el servidor de produccion (Vercel/Netlify).',
    );
  }

  if (import.meta.env.VITE_DEEPSEEK_API_KEY) {
    warnings.push(
      'VITE_DEEPSEEK_API_KEY esta visible en el frontend. ' +
        'Esto es inseguro en produccion. Usa el proxy serverless (/api/ocr) con DEEPSEEK_API_KEY en el servidor.',
    );
  }

  if (warnings.length > 0) {
    console.warn('[SaraIA] ' + warnings.join(' | '));
  }

  validated = true;
  return { success: true, warnings };
}

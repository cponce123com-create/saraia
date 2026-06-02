import { z } from 'zod';

const envSchema = z.object({
  VITE_DEEPSEEK_API_KEY: z
    .string()
    .min(1, 'La clave de DeepSeek API es requerida')
    .startsWith('sk-', 'La clave debe empezar con sk-'),
});

let validated = false;

export function validateEnv(): { success: boolean; data?: Record<string, unknown>; errors?: z.ZodIssue[] } {
  if (validated) return { success: true, data: {} };

  const parsed = envSchema.safeParse({
    VITE_DEEPSEEK_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY,
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    console.warn('[SaraIA] \u26a0\ufe0f Variables de entorno inv\u00e1lidas:\n' + errors.join('\n'));
    console.warn('[SaraIA] \u26a0\ufe0f Copia .env.example a .env y configura las variables faltantes.');
    return { success: false, errors: parsed.error.issues };
  }

  validated = true;
  return { success: true, data: parsed.data as Record<string, unknown> };
}

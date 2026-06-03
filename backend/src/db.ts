import { Pool } from '@neondatabase/serverless';

// Usar variable de entorno o default para desarrollo local
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] WARNING: DATABASE_URL no configurada. Usar solo para desarrollo.');
}

export const pool = new Pool({ connectionString });

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

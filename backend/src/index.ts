import express from 'express';
import cors from 'cors';
import { runMigrations } from './migrate';
import gastosRouter from './routes/gastos';
import facturasRouter from './routes/facturas';
import empresasRouter from './routes/empresas';
import personalRouter from './routes/personal';
import asistenciasRouter from './routes/asistencias';
import ocrRouter from './routes/ocr';
import authRouter from './routes/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/gastos', gastosRouter);
app.use('/api/facturas', facturasRouter);
app.use('/api/empresas', empresasRouter);
app.use('/api/personal', personalRouter);
app.use('/api/asistencias', asistenciasRouter);
app.use('/api/auth', authRouter);
app.use('/api/ocr', ocrRouter);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Startup
async function start() {
  try {
    await runMigrations();
    console.log('[server] Migraciones aplicadas');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[server] SaraIA API corriendo en puerto ${PORT}`);
      console.log(`[server] Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[server] Error al iniciar:', err);
    process.exit(1);
  }
}

start();

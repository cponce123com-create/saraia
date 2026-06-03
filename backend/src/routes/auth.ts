import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db';
import { signToken } from '../middleware/auth';
import type { UsuarioRow, LoginBody, RegisterBody, JwtPayload } from '../auth-types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, rol, empresa_id } = req.body as RegisterBody;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'email, password y nombre son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el email ya existe
    const existente = await queryOne<UsuarioRow>('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userRol = rol || 'supervisor';

    const user = await queryOne<UsuarioRow>(
      `INSERT INTO usuarios (email, password_hash, nombre, rol, empresa_id, activo)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, email, nombre, rol, empresa_id, activo, created_at`,
      [email, password_hash, nombre, userRol, empresa_id || null],
    );

    if (!user) {
      return res.status(500).json({ error: 'Error al crear usuario' });
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol as JwtPayload['rol'],
      empresaId: user.empresa_id,
    };

    const token = signToken(payload);

    res.status(201).json({ token, user: payload });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }

    const user = await queryOne<UsuarioRow>(
      'SELECT * FROM usuarios WHERE email = $1',
      [email],
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
    }

    const passwordValida = await bcrypt.compare(password, user.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol as JwtPayload['rol'],
      empresaId: user.empresa_id,
    };

    const token = signToken(payload);

    res.json({ token, user: payload });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me — devuelve el usuario del token actual
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'saraia-dev-secret-change-in-production';
    const decoded = jwt.default.verify(header.split(' ')[1], JWT_SECRET) as JwtPayload;

    const user = await queryOne<UsuarioRow>(
      'SELECT id, email, nombre, rol, empresa_id, activo, created_at FROM usuarios WHERE id = $1',
      [decoded.userId],
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!user.activo) return res.status(401).json({ error: 'Cuenta desactivada' });

    res.json({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      empresaId: user.empresa_id,
    });
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;

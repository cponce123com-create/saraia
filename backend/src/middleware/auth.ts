import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRol } from '../auth-types';

const JWT_SECRET = process.env.JWT_SECRET || 'saraia-dev-secret-change-in-production';

// Extender Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles: UserRol[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: `Acceso denegado. Roles permitidos: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export function requireEmpresa(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.empresaId) {
    res.status(400).json({ error: 'Usuario sin empresa asignada. Contacta al administrador.' });
    return;
  }
  next();
}

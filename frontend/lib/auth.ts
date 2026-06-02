import jwt from 'jsonwebtoken';
import { AuthToken } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'quantxbooks-secret-key-change-in-production';

export function signToken(payload: Omit<AuthToken, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

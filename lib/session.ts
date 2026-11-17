import crypto from 'crypto';

const TTL_SECONDS = 60 * 60 * 12;

export interface SessionPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const raw = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return raw.replace(/^['"`]|['"`]$/g, '').trim();
}

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function createSessionToken(user: { id: string; email: string; role: string }): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error('Defina SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY em .env.local para emitir sessoes.');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TTL_SECONDS
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  const secret = getSecret();
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload || !payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionFromRequest(req: Request): SessionPayload | null {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return verifySessionToken(token);
}

import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { collection } from './db';
import type { User, PublicUser } from './types';
export function publicUser(user: User): PublicUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
function secret() {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32) throw new Error('SESSION_SECRET must be configured');
  return new TextEncoder().encode(key);
}
export async function session() {
  try {
    const token = (await cookies()).get('ks_session')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const user = await (await collection<User>('users')).findOne({ _id: String(payload.sub) });
    return user && (payload.version || 0) === (user.sessionVersion || 0) ? publicUser(user) : null;
  } catch {
    return null;
  }
}
export async function setSession(user: User) {
  const token = await new SignJWT({ role: user.role, version: user.sessionVersion || 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user._id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
  (await cookies()).set('ks_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  });
}
export async function clearSession() {
  (await cookies()).delete('ks_session');
  (await cookies()).delete('ks_guest');
}
export async function requireUser() {
  const user = await session();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return user;
}
export async function assertOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  const host = h.get('host');
  if (!origin || new URL(origin).host !== host)
    throw new HttpError(403, 'Request origin is not allowed.');
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type OrderIdentity = {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
};
export async function orderIdentity(): Promise<OrderIdentity | null> {
  const user = await session();
  if (user) return user;
  try {
    const token = (await cookies()).get('ks_guest')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (
      payload.kind !== 'guest' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    )
      return null;
    return {
      _id: payload.sub,
      name: String(payload.name || 'Guest'),
      email: payload.email,
      role: 'customer',
    };
  } catch {
    return null;
  }
}

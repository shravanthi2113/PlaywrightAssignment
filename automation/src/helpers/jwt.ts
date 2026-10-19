import { createHmac } from 'node:crypto';

const b64url = (v: object | Buffer) => Buffer.from(v instanceof Buffer ? v : JSON.stringify(v)).toString('base64url');

// Minimal HS256 signer, used to forge expired / wrongly-signed tokens in auth tests.
export function signJwt(sub: string, secret: string, expiresInSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url({ sub, iat: now, exp: now + expiresInSeconds });
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest();
  return `${head}.${body}.${b64url(sig)}`;
}

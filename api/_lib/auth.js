// Verifies Firebase ID tokens sent from the browser (Authorization: Bearer <token>).
// Uses Google's public signing keys, so only FIREBASE_PROJECT_ID is required on the server.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

export async function requireUser(req) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthError('Missing sign-in token');
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('no subject');
    return { uid: payload.sub, email: payload.email || null, name: payload.name || null };
  } catch {
    throw new AuthError('Invalid or expired sign-in token');
  }
}

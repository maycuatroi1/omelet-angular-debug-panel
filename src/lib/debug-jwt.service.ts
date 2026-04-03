import { Injectable } from '@angular/core';
import { SignJWT } from 'jose';

export interface DebugTokenPair {
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class DebugJwtService {
  private readonly STORAGE_KEY = 'debug_jwt_signing_key';

  getStoredSigningKey(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  setSigningKey(key: string): void {
    localStorage.setItem(this.STORAGE_KEY, key);
  }

  clearSigningKey(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async generateTokens(email: string, signingKey: string, role = 'admin'): Promise<DebugTokenPair> {
    const secretKey = new TextEncoder().encode(signingKey);
    const now = Math.floor(Date.now() / 1000);
    const userId = crypto.randomUUID();

    const access = await new SignJWT({
      token_type: 'access',
      user_id: userId,
      email,
      role,
      jti: crypto.randomUUID().replace(/-/g, ''),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 86400)
      .sign(secretKey);

    const refresh = await new SignJWT({
      token_type: 'refresh',
      user_id: userId,
      email,
      jti: crypto.randomUUID().replace(/-/g, ''),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 365 * 86400)
      .sign(secretKey);

    return { access, refresh };
  }
}

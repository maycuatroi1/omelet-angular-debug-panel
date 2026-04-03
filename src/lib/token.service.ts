import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DebugTokenService {
  private readonly ACCESS_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';

  getAccessToken(): string | null {
    const token = localStorage.getItem(this.ACCESS_KEY);
    return this.isValid(token) ? token : null;
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(this.ACCESS_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  private isValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return !payload.exp || Math.floor(Date.now() / 1000) < payload.exp;
    } catch {
      return false;
    }
  }
}

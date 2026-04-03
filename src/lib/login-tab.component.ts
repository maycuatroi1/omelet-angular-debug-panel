import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DebugJwtService } from './debug-jwt.service';
import { DebugTokenService } from './token.service';
import { DEBUG_PANEL_CONFIG } from './tokens';

@Component({
  selector: 'omelet-login-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 space-y-4">
      @if (roles.length > 0) {
        <div>
          <label class="block text-xs text-gray-400 mb-1">Quick Switch by Role</label>
          <div class="grid grid-cols-2 gap-2">
            @for (role of roles; track role.value) {
              <button
                (click)="quickSwitchToRole(role.value)"
                [disabled]="isLoading() || !hasStoredKey()"
                [title]="!hasStoredKey() ? 'Enter JWT signing key first' : 'Switch to ' + role.label"
                class="px-2 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded transition-colors truncate"
              >
                {{ role.label }}
              </button>
            }
          </div>
          @if (!hasStoredKey()) {
            <p class="text-xs text-yellow-500 mt-1">Enter JWT signing key below to enable quick switch</p>
          }
        </div>
        <div class="border-t border-gray-700 pt-4">
          <p class="text-xs text-gray-500 mb-3">Or login manually:</p>
        </div>
      }

      <div>
        <label class="block text-xs text-gray-400 mb-1">Email</label>
        <input
          type="email"
          [(ngModel)]="emailInput"
          placeholder="user&#64;example.com"
          class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label class="block text-xs text-gray-400 mb-1">JWT Signing Key</label>
        <div class="relative">
          <input
            [type]="showKey() ? 'text' : 'password'"
            [(ngModel)]="jwtSigningKey"
            placeholder="Enter JWT signing key"
            class="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            (click)="showKey.set(!showKey())"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <i [class]="showKey() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
          </button>
        </div>
        @if (hasStoredKey()) {
          <p class="text-xs text-green-400 mt-1">Key loaded from storage</p>
        }
      </div>

      @if (errorMessage()) {
        <div class="bg-red-900/50 border border-red-500 rounded p-2 text-xs text-red-300">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="bg-green-900/50 border border-green-500 rounded p-2 text-xs text-green-300">{{ successMessage() }}</div>
      }

      <button
        (click)="debugLogin()"
        [disabled]="isLoading()"
        class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
      >
        @if (isLoading()) {
          <span class="flex items-center justify-center">
            <i class="pi pi-spin pi-spinner mr-2"></i> Generating...
          </span>
        } @else {
          Login as User
        }
      </button>

      @if (hasStoredKey()) {
        <button
          (click)="clearStoredKey()"
          class="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors text-gray-300"
        >
          Clear Stored Key
        </button>
      }
    </div>
  `,
})
export class LoginTabComponent implements OnInit {
  private config = inject(DEBUG_PANEL_CONFIG, { optional: true });
  private jwtService = inject(DebugJwtService);
  private tokenService = inject(DebugTokenService);

  emailInput = '';
  jwtSigningKey = '';
  showKey = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  hasStoredKey = signal(false);

  get roles(): { value: string; label: string }[] {
    return this.config?.login?.roles ?? [];
  }

  private get apiUrl(): string {
    return this.config?.login?.apiUrl ?? '';
  }

  private get userByRoleEndpoint(): string {
    return this.config?.login?.userByRoleEndpoint ?? '/internal/debug/user-by-role/';
  }

  ngOnInit(): void {
    const storedKey = this.jwtService.getStoredSigningKey();
    if (storedKey) {
      this.jwtSigningKey = storedKey;
      this.hasStoredKey.set(true);
    }
  }

  async debugLogin(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    const email = this.emailInput.trim();
    if (!email || !email.includes('@')) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }
    if (!this.jwtSigningKey.trim()) {
      this.errorMessage.set('Please enter the JWT signing key');
      return;
    }

    this.isLoading.set(true);
    try {
      this.jwtService.setSigningKey(this.jwtSigningKey);
      this.hasStoredKey.set(true);
      const tokens = await this.jwtService.generateTokens(email, this.jwtSigningKey);
      this.tokenService.setTokens(tokens.access, tokens.refresh);
      localStorage.removeItem('user_profile');
      this.successMessage.set(`Tokens generated for: ${email}. Reloading...`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      this.errorMessage.set(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  async quickSwitchToRole(roleName: string): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.jwtSigningKey.trim()) {
      this.errorMessage.set('Please enter the JWT signing key first');
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await fetch(
        `${this.apiUrl}${this.userByRoleEndpoint}?role_name=${encodeURIComponent(roleName)}`,
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `No user found with role: ${roleName}`);
      }

      const userData = await response.json();
      this.jwtService.setSigningKey(this.jwtSigningKey);
      this.hasStoredKey.set(true);

      const tokens = await this.jwtService.generateTokens(userData.email, this.jwtSigningKey);
      this.tokenService.setTokens(tokens.access, tokens.refresh);
      localStorage.removeItem('user_profile');

      const label = this.roles.find((r) => r.value === roleName)?.label || roleName;
      this.successMessage.set(`Switching to ${label} (${userData.email}). Reloading...`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to switch user');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearStoredKey(): void {
    this.jwtService.clearSigningKey();
    this.jwtSigningKey = '';
    this.hasStoredKey.set(false);
    this.successMessage.set('Signing key cleared from storage');
  }
}

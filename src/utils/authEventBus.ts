import React from 'react';
import { StoredUser } from './token';

export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
export const AUTH_REAUTHENTICATED_EVENT = 'auth:reauthenticated';
export const AUTH_REAUTH_DISMISSED_EVENT = 'auth:reauth-dismissed';
export const AUTH_OPEN_REAUTH_EVENT = 'auth:open-reauth';

export interface SessionExpiredDetail {
  email?: string;
  message?: string;
  url?: string;
}

export interface ReauthenticatedDetail {
  user?: StoredUser;
}

export interface AuthModalContextValue {
  hasGlobalModal: boolean;
}

export const AuthModalContext = React.createContext<AuthModalContextValue>({
  hasGlobalModal: false,
});

export function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as {
    isUnauthorized?: boolean;
    status?: number;
    response?: { status?: number };
  };
  return (
    candidate.isUnauthorized === true ||
    candidate.status === 401 ||
    candidate.response?.status === 401
  );
}

class AuthEventBus {
  emitSessionExpired(detail: SessionExpiredDetail = {}): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<SessionExpiredDetail>(AUTH_SESSION_EXPIRED_EVENT, {
        detail,
      })
    );
  }

  onSessionExpired(
    handler: (detail: SessionExpiredDetail) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<SessionExpiredDetail>;
      handler(customEvent.detail || {});
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    };
  }

  emitReauthenticated(detail: ReauthenticatedDetail = {}): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<ReauthenticatedDetail>(AUTH_REAUTHENTICATED_EVENT, {
        detail,
      })
    );
  }

  onReauthenticated(
    handler: (detail: ReauthenticatedDetail) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<ReauthenticatedDetail>;
      handler(customEvent.detail || {});
    };
    window.addEventListener(AUTH_REAUTHENTICATED_EVENT, listener);
    return () => {
      window.removeEventListener(AUTH_REAUTHENTICATED_EVENT, listener);
    };
  }

  emitReauthDismissed(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AUTH_REAUTH_DISMISSED_EVENT));
  }

  onReauthDismissed(handler: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = () => {
      handler();
    };
    window.addEventListener(AUTH_REAUTH_DISMISSED_EVENT, listener);
    return () => {
      window.removeEventListener(AUTH_REAUTH_DISMISSED_EVENT, listener);
    };
  }

  emitOpenReauth(detail: SessionExpiredDetail = {}): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent<SessionExpiredDetail>(AUTH_OPEN_REAUTH_EVENT, {
        detail,
      })
    );
  }

  onOpenReauth(handler: (detail: SessionExpiredDetail) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<SessionExpiredDetail>;
      handler(customEvent.detail || {});
    };
    window.addEventListener(AUTH_OPEN_REAUTH_EVENT, listener);
    return () => {
      window.removeEventListener(AUTH_OPEN_REAUTH_EVENT, listener);
    };
  }
}

export const authEventBus = new AuthEventBus();

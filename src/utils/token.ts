export interface StoredUser {
    id?: string;
    name: string;
    email: string;
}

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'auth_user';

export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setStoredUser = (user: StoredUser): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getStoredUser = (): StoredUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return {
                id: typeof parsed.id === 'string' ? parsed.id : undefined,
                name: typeof parsed.name === 'string' ? parsed.name : '',
                email: typeof parsed.email === 'string' ? parsed.email : '',
            };
        }
        return null;
    } catch {
        return null;
    }
};

export const removeStoredUser = (): void => {
    localStorage.removeItem(USER_KEY);
};

export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    removeStoredUser();
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

export const getUserIdFromToken = (rawToken?: string | null): string | null => {
    const token = rawToken ?? getToken();
    if (!token || typeof token !== 'string') {
        return null;
    }
    const parts = token.split('.');
    if (parts.length < 2) {
        return null;
    }
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        const decoded = JSON.parse(atob(padded));
        if (decoded && typeof decoded === 'object') {
            const candidate = decoded.id ?? decoded.userId ?? decoded._id ?? decoded.sub;
            if (typeof candidate === 'string' && candidate.trim() && !candidate.includes('@')) {
                return candidate.trim();
            }
        }
        return null;
    } catch {
        return null;
    }
};

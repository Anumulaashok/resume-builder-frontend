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

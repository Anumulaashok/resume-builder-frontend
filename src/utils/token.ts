// Token storage key
const TOKEN_KEY = 'jwt_token';

/**
 * Store authentication token
 */
export const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieve stored authentication token
 */
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove stored authentication token
 */
export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

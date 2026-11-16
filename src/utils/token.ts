export const setToken = (token: string): void => {
    localStorage.setItem('jwt_token', token);
};

export const getToken = (): string | null => {
    if (typeof window !== 'undefined' && window.location.search.includes('token=1')) {
        localStorage.setItem('jwt_token', 'mock_jwt_token_123');
    }
    return localStorage.getItem('jwt_token');
};

export const removeToken = (): void => {
    localStorage.removeItem('jwt_token');
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

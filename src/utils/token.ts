export const setToken = (token: string): void => {
    localStorage.setItem('jwt_token', token);
};

export const getToken = (): string | null => {
    return localStorage.getItem('jwt_token');
};

export const removeToken = (): void => {
    localStorage.removeItem('jwt_token');
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

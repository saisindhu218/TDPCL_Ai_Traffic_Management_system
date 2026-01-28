import api from './api';

export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const register = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getProfile = async () => {
    try {
        const response = await api.get('/auth/profile');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const logout = async () => {
    try {
        await api.post('/auth/logout');
        localStorage.removeItem('token');
    } catch (error) {
        console.error('Logout error:', error);
    }
};
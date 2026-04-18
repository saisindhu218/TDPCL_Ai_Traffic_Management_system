import React, { createContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../utils/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const clearAuthState = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const getUserFromTokenPayload = (rawToken) => {
    try {
      if (!rawToken?.includes('.')) {
        return null;
      }

      const payloadSegment = rawToken.split('.')[1];
      const normalizedPayload = payloadSegment.replaceAll('-', '+').replaceAll('_', '/');
      const decodedPayload = JSON.parse(atob(normalizedPayload));
      const userPayload = decodedPayload?.user;

      if (!userPayload?.id || !userPayload?.role) {
        return null;
      }

      return {
        id: userPayload.id,
        role: userPayload.role,
        name: userPayload.name || 'Authenticated User',
        email: userPayload.email || ''
      };
    } catch (err) {
      console.warn('Unable to parse token payload for auth fallback', err);
      return null;
    }
  };

  const [user, setUser] = useState(() => {
    try {
      const cachedUser = localStorage.getItem('user');
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (err) {
      console.error(err);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        console.error(err);
        const statusCode = err?.response?.status;

        if (statusCode === 401 || statusCode === 403) {
          clearAuthState();
          return;
        }

        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            return;
          } catch (cachedParseErr) {
            console.warn('Unable to parse cached user during auth bootstrap', cachedParseErr);
          }
        }

        const tokenUser = getUserFromTokenPayload(token);
        if (tokenUser) {
          setUser(tokenUser);
          localStorage.setItem('user', JSON.stringify(tokenUser));
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return { success: true, user: res.data.user };
    } catch (err) {
      console.error(err);
      return { success: false, msg: err.response?.data?.msg || 'Login failed' };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const res = await apiClient.post('/auth/register', { name, email, password, role });
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return { success: true, user: res.data.user };
    } catch (err) {
      console.error(err);
      return { success: false, msg: err.response?.data?.msg || 'Registration failed' };
    }
  };

  const logout = () => {
    clearAuthState();
  };

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

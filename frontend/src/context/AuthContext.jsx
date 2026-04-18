import React, { createContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../utils/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
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
        const cachedUser = localStorage.getItem('user');
        if (!cachedUser) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

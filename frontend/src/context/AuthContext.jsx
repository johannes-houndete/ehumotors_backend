import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiUrl } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('ehu_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('ehu_token') || null;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ehu_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ehu_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(apiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Identifiants ou connexion invalides.');
      }
      
      // Save state
      setUser(data.user);
      setToken(data.access);
      
      // Persist in localStorage
      localStorage.setItem('ehu_user', JSON.stringify(data.user));
      localStorage.setItem('ehu_token', data.access);
      if (data.refresh) {
        localStorage.setItem('ehu_refresh_token', data.refresh);
      }
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ehu_user');
    localStorage.removeItem('ehu_token');
    localStorage.removeItem('ehu_refresh_token');
  };

  let refreshPromise = null;

  const refreshToken = async () => {
    const storedRefresh = localStorage.getItem('ehu_refresh_token');
    if (!storedRefresh) {
      throw new Error('No refresh token');
    }
    const response = await fetch(apiUrl('/api/auth/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: storedRefresh }),
    });
    if (!response.ok) {
      throw new Error('Refresh failed');
    }
    const data = await response.json();
    setToken(data.access);
    localStorage.setItem('ehu_token', data.access);
    if (data.refresh) {
      localStorage.setItem('ehu_refresh_token', data.refresh);
    }
    return data.access;
  };

  // Pre-configured fetch helper that includes authorization header
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(apiUrl(url), {
      ...options,
      headers,
    });

    if (response.status === 401) {
      try {
        if (!refreshPromise) {
          refreshPromise = refreshToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(apiUrl(url), {
          ...options,
          headers,
        });
      } catch {
        logout();
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }
    }

    return response;
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        theme,
        toggleTheme,
        login,
        logout,
        apiFetch,
        isAuthenticated,
        isAdmin,
        isAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

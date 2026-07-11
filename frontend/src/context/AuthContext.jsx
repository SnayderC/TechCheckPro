import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';

const AuthContext = createContext();

const parseJwt = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access');
      const refresh = localStorage.getItem('refresh');

      if (!token) {
        setLoading(false);
        return;
      }

      const payload = parseJwt(token);
      const isExpired = !payload || payload.exp * 1000 <= Date.now();

      if (!isExpired) {
        setUser({ username: localStorage.getItem('username') || payload.username || 'Usuario' });
        setLoading(false);
        return;
      }

      if (refresh) {
        try {
          const res = await apiClient.post('/token/refresh/', { refresh });
          localStorage.setItem('access', res.data.access);
          setUser({ username: localStorage.getItem('username') || 'Usuario' });
        } catch {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          localStorage.removeItem('username');
          localStorage.removeItem('activeEvalId');
        }
      } else {
        localStorage.removeItem('access');
        localStorage.removeItem('username');
        localStorage.removeItem('activeEvalId');
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (username, password) => {
    const res = await apiClient.post('/token/', { username, password });
    localStorage.setItem('access', res.data.access);
    localStorage.setItem('refresh', res.data.refresh);
    localStorage.setItem('username', username);
    setUser({ username });
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    localStorage.removeItem('activeEvalId');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Verificando sesión...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

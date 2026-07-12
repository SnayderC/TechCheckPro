import React, { createContext, useState, useEffect } from 'react';
import apiClient, { authService } from '../services/api';

export const AuthContext = createContext(null);

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPerfil = async () => {
    const perfil = await authService.getPerfil();
    setUser(perfil);
    localStorage.setItem('username', perfil.username);
    localStorage.setItem('rol', perfil.rol);
    return perfil;
  };

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
        try {
          await loadPerfil();
        } catch {
          setUser({
            username: localStorage.getItem('username') || 'Usuario',
            rol: localStorage.getItem('rol') || 'EVALUADOR',
          });
        }
        setLoading(false);
        return;
      }

      if (refresh) {
        try {
          const res = await apiClient.post('/token/refresh/', { refresh });
          localStorage.setItem('access', res.data.access);
          try {
            await loadPerfil();
          } catch {
            setUser({
              username: localStorage.getItem('username') || 'Usuario',
              rol: localStorage.getItem('rol') || 'EVALUADOR',
            });
          }
        } catch {
          localStorage.clear();
        }
      } else {
        localStorage.clear();
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
    try {
      await loadPerfil();
    } catch {
      setUser({ username, rol: localStorage.getItem('rol') || 'EVALUADOR' });
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const isAdmin = user?.rol === 'ADMIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Verificando sesión...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, loadPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

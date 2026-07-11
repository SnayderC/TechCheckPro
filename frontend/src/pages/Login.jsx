import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(credentials.username, credentials.password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'Sesión expirada. Inicie sesión nuevamente.'
        : err.response?.data?.error || 'Credenciales inválidas. Verifique usuario y contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Fondo decorativo con brillo sutil */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-[400px] p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl bg-white/5 shadow-2xl z-10">
        <div className="text-center mb-10">
          {/* Logo del Escudo con Visto */}
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <ShieldCheck className="text-white" size={32} strokeWidth={2.5} />
          </div>
          
          <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido</h1>
          <p className="text-gray-400 text-sm mt-1">Acceso al motor de inferencia TOE</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Usuario */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Usuario</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text"
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
                placeholder="Nombre de usuario"
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
          </div>

          {/* Input Contraseña */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password"
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50 transition-all"
                placeholder="••••••••"
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98] flex justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
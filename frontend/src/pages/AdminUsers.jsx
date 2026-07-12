import React, { useEffect, useState } from 'react';
import { Users, UserPlus, RefreshCw, Shield } from 'lucide-react';
import { adminService } from '../services/api';

function AdminUsers() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', first_name: '', password: '', rol: 'EVALUADOR' });

  const cargar = async () => {
    setLoading(true);
    try {
      setUsuarios(await adminService.getUsuarios());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    try {
      await adminService.crearUsuario(form);
      setForm({ username: '', email: '', first_name: '', password: '', rol: 'EVALUADOR' });
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  const toggleActivo = async (u) => {
    await adminService.actualizarUsuario(u.id, { is_active: !u.is_active });
    cargar();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Users size={20} className="text-blue-400" /> Gestión de Usuarios
      </h2>

      <form onSubmit={crear} className="glass p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Usuario *" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white" />
        <input placeholder="Correo institucional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white" />
        <input placeholder="Nombre completo" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white" />
        <input placeholder="Contraseña temporal" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white" />
        <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white">
          <option value="EVALUADOR">Evaluador TI</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
          <UserPlus size={16} /> Confirmar Registro
        </button>
      </form>

      {loading ? (
        <RefreshCw className="animate-spin text-blue-500 mx-auto" size={24} />
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="glass p-4 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">{u.username}</span>
                <span className="text-xs text-gray-500 ml-2">{u.email}</span>
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${u.rol === 'ADMIN' ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                  {u.rol}
                </span>
              </div>
              <button onClick={() => toggleActivo(u)} className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${u.is_active ? 'text-red-400 border-red-500/30' : 'text-emerald-400 border-emerald-500/30'}`}>
                {u.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

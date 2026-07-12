import React, { useEffect, useState } from 'react';
import { Settings, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { adminService } from '../services/api';

function AdminCatalog() {
  const [dimensiones, setDimensiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoSubf, setNuevoSubf] = useState({ factor_id: '', enunciado: '' });

  const cargar = async () => {
    setLoading(true);
    try {
      setDimensiones(await adminService.getDimensiones());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const agregarSubfactor = async (e) => {
    e.preventDefault();
    if (!nuevoSubf.factor_id || !nuevoSubf.enunciado.trim()) return;
    try {
      await adminService.crearSubfactor({
        factor_id: nuevoSubf.factor_id,
        enunciado_pregunta: nuevoSubf.enunciado,
      });
      setNuevoSubf({ factor_id: '', enunciado: '' });
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar subfactor');
    }
  };

  const eliminarSubfactor = async (id) => {
    if (!confirm('¿Eliminar este subfactor?')) return;
    await adminService.eliminarSubfactor(id);
    cargar();
  };

  const todosFactores = dimensiones.flatMap((d) =>
    (d.factores || []).map((f) => ({ ...f, dimension_nombre: d.nombre_dimension })),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-blue-400" /> Configuración del Modelo TOE
        </h2>
        <button onClick={cargar} className="text-xs text-gray-400 hover:text-white cursor-pointer flex items-center gap-1">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      <form onSubmit={agregarSubfactor} className="glass p-5 rounded-2xl border border-gray-800 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Plus size={14} /> Agregar Subfactor
        </p>
        <select
          value={nuevoSubf.factor_id}
          onChange={(e) => setNuevoSubf({ ...nuevoSubf, factor_id: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white"
          required
        >
          <option value="">Seleccionar factor...</option>
          {todosFactores.map((f) => (
            <option key={f.id} value={f.id}>[{f.dimension_nombre}] {f.nombre_factor}</option>
          ))}
        </select>
        <input
          placeholder="Enunciado del subfactor"
          value={nuevoSubf.enunciado}
          onChange={(e) => setNuevoSubf({ ...nuevoSubf, enunciado: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white"
          required
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">
          Guardar
        </button>
      </form>

      {loading ? (
        <RefreshCw className="animate-spin text-blue-500 mx-auto" size={24} />
      ) : (
        dimensiones.map((dim) => (
          <div key={dim.id} className="glass p-5 rounded-2xl border border-gray-800 space-y-3">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">{dim.nombre_dimension}</h3>
            {(dim.factores || []).map((f) => (
              <div key={f.id} className="ml-2 space-y-1">
                <p className="text-sm font-semibold text-white">{f.nombre_factor}</p>
                {(f.subfactores || []).map((sf) => (
                  <div key={sf.id} className="flex items-start justify-between gap-2 text-xs text-gray-400 pl-3 py-1 border-l border-gray-800">
                    <span>{sf.enunciado_pregunta}</span>
                    <button onClick={() => eliminarSubfactor(sf.id)} className="text-red-400 shrink-0 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default AdminCatalog;

import React, { useState, useEffect } from 'react';
import { PlusCircle, Play, History, Shield, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, Search, Filter } from 'lucide-react';
import { toeService } from '../services/api';

function Dashboard({ onNavigate }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [filtros, setFiltros] = useState({ q: '', dictamen: '', anio: '' });

  const [formData, setFormData] = useState({ nombre: '', version: '', proveedor: '', descripcion: '' });

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setErrorCarga(null);
      const [data, alertasData] = await Promise.all([
        toeService.getMisEvaluaciones(filtros),
        toeService.getAlertas(),
      ]);
      setEvaluaciones(data || []);
      setAlertas(alertasData || []);
    } catch (err) {
      console.error(err);
      setErrorCarga('No se pudo cargar el portafolio. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, [filtros.q, filtros.dictamen, filtros.anio]);

  const handleCrearProyecto = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    setCreando(true);
    try {
      const res = await toeService.iniciarEvaluacion(formData);
      if (res.evaluacion_id) {
        localStorage.setItem('activeEvalId', res.evaluacion_id);
        onNavigate();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo crear el proyecto.');
    } finally {
      setCreando(false);
    }
  };

  const handleSeleccionarProyecto = (evalId) => {
    localStorage.setItem('activeEvalId', evalId);
    onNavigate();
  };

  const irAlerta = (evalId) => {
    localStorage.setItem('activeEvalId', evalId);
    onNavigate();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a.evaluacion_id}
              onClick={() => irAlerta(a.evaluacion_id)}
              className="glass p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3 cursor-pointer animate-pulse hover:animate-none"
            >
              <AlertTriangle className="text-amber-400 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">
                  Evaluación incompleta: {a.software}
                </p>
                <p className="text-xs text-amber-400/80">
                  Sin modificaciones hace {a.dias_inactivo} días — haga clic para reanudar
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass p-8 rounded-3xl border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Marco TOE
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight">Gestión de Alcance & Auditoría</h2>
          <p className="text-gray-400 text-sm max-w-xl">Registre software FLOSS o continúe evaluaciones en curso.</p>
        </div>
        <Shield size={40} className="hidden lg:block text-blue-400" strokeWidth={1.5} />
      </div>

      <div className="glass p-4 rounded-2xl border border-gray-800 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-gray-500" />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            placeholder="Buscar software o evaluador..."
            value={filtros.q}
            onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white"
          />
        </div>
        <select value={filtros.dictamen} onChange={(e) => setFiltros({ ...filtros, dictamen: e.target.value })}
          className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">
          <option value="">Todos los dictámenes</option>
          <option value="A">Adoptar (A)</option>
          <option value="B">Condicionar (B)</option>
          <option value="C">Rechazar (C)</option>
        </select>
        <input placeholder="Año" value={filtros.anio} onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
          className="w-24 bg-[#0a0a0a] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="glass p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-4">
              <PlusCircle className="text-blue-500" size={20} />
              <h3 className="text-base font-bold text-white">Nuevo Software FLOSS</h3>
            </div>
            <form onSubmit={handleCrearProyecto} className="space-y-3">
              <input required placeholder="Nombre del software *" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Versión" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white" />
                <input placeholder="Proveedor" value={formData.proveedor} onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  className="bg-[#0a0a0a] border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <textarea placeholder="Descripción corporativa" rows={2} value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
              <button type="submit" disabled={creando}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer flex items-center justify-center gap-2">
                {creando ? <RefreshCw className="animate-spin" size={18} /> : <Play size={16} fill="currentColor" />}
                Crear Proyecto
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <History size={16} className="text-blue-400" /> Historial ({evaluaciones.length})
            </h3>
            <button onClick={cargarHistorial} className="text-xs text-gray-400 hover:text-white cursor-pointer flex items-center gap-1">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>

          {errorCarga && <div className="glass p-4 rounded-xl border border-red-500/30 text-red-400 text-xs">{errorCarga}</div>}

          {loading ? (
            <div className="glass p-12 rounded-2xl border border-gray-800 text-center">
              <RefreshCw className="animate-spin text-blue-500 mx-auto" size={28} />
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="glass p-10 rounded-2xl border border-gray-800 text-center space-y-2">
              <AlertCircle className="text-gray-600 mx-auto" size={36} />
              <p className="text-sm text-gray-300">No se encontraron proyectos bajo los criterios especificados.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {evaluaciones.map((item) => (
                <div key={item.id} onClick={() => handleSeleccionarProyecto(item.id)}
                  className="glass p-5 rounded-2xl border border-gray-800 hover:border-blue-500/50 cursor-pointer flex items-center justify-between gap-4 group">
                  <div>
                    <span className="font-bold text-white group-hover:text-blue-400">{item.software?.nombre}</span>
                    <span className="text-[10px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded ml-2">v{item.software?.version}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      #{item.id} · {item.evaluador && `${item.evaluador} · `}
                      {new Date(item.fecha_ultima_modificacion).toLocaleDateString()}
                      {item.clase_dictamen && ` · ${item.clase_dictamen}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                    item.estado === 'Bloqueado' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    : item.estado === 'Calculado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {(item.estado === 'Calculado' || item.estado === 'Bloqueado') && <CheckCircle2 size={12} />}
                    {item.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

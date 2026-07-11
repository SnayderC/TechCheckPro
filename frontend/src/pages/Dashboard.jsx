import React, { useState, useEffect } from 'react';
import { PlusCircle, Play, History, Shield, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { toeService } from '../services/api';

function Dashboard({ onNavigate }) {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Formulario para nuevo software objetivo
  const [formData, setFormData] = useState({
    nombre: '',
    version: '',
    proveedor: ''
  });

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setErrorCarga(null);
      const data = await toeService.getMisEvaluaciones();
      setEvaluaciones(data || []);
    } catch (err) {
      console.error('Error al cargar historial de auditorías:', err);
      setErrorCarga('No se pudo cargar el portafolio. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const handleCrearProyecto = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setCreando(true);
    try {
      const res = await toeService.iniciarEvaluacion(formData);
      if (res.evaluacion_id) {
        // Sincronizamos el nuevo proyecto en localStorage y pasamos al Wizard
        localStorage.setItem('activeEvalId', res.evaluacion_id);
        onNavigate();
      }
    } catch (err) {
      console.error('Error creando proyecto:', err);
      alert('No se pudo crear el proyecto. Verifique la conexión.');
    } finally {
      setCreando(false);
    }
  };

  const handleSeleccionarProyecto = (evalId) => {
    localStorage.setItem('activeEvalId', evalId);
    onNavigate();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Bienvenida y Contexto */}
      <div className="glass p-8 rounded-3xl border border-gray-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Marco Tecnológico-Organizacional-Económico
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Gestión de Alcance & Auditoría
          </h2>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            Seleccione una evaluación existente para continuar su calificación o registre un nuevo software objetivo para inicializar la matriz de 61 subfactores en PostgreSQL.
          </p>
        </div>
        <div className="hidden lg:flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 shrink-0">
          <Shield size={40} strokeWidth={1.5} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA (5 Col): Formulario de Registro */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass p-6 rounded-2xl border border-gray-800 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-800/80 pb-4">
              <PlusCircle className="text-blue-500" size={20} />
              <h3 className="text-base font-bold text-white">Auditar Nuevo Software FLOSS</h3>
            </div>

            <form onSubmit={handleCrearProyecto} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">
                  Nombre del Software Objetivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Odoo ERP, Nextcloud Hub, WordPress..."
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">
                    Versión
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 17.0 Community"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">
                    Proveedor / Comunidad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Odoo S.A."
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creando}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {creando ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Registrando en Base de Datos...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Inicializar Matriz & Auditar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA (7 Col): Historial de Evaluaciones */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-blue-400" /> Mis Auditorías en Curso ({evaluaciones.length})
            </h3>
            <button
              onClick={cargarHistorial}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualizar lista
            </button>
          </div>

          {errorCarga && (
            <div className="glass p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-xs font-medium">
              {errorCarga}
            </div>
          )}

          {loading ? (
            <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-3">
              <RefreshCw className="animate-spin text-blue-500 mx-auto" size={28} />
              <p className="text-xs text-gray-400">Consultando portafolio en PostgreSQL...</p>
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="glass p-10 rounded-2xl border border-gray-800/80 text-center space-y-3">
              <AlertCircle className="text-gray-600 mx-auto" size={36} />
              <p className="text-sm font-medium text-gray-300">No tienes auditorías registradas aún.</p>
              <p className="text-xs text-gray-500">Utiliza el formulario de la izquierda para crear tu primer proyecto FLOSS.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {evaluaciones.map((item) => {
                const esCalculado = item.estado === 'Calculado';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSeleccionarProyecto(item.id)}
                    className="glass p-5 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">
                          {item.software?.nombre || 'Software sin título'}
                        </span>
                        <span className="text-[10px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">
                          v{item.software?.version || '1.0'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-3">
                        <span>ID: #{item.id}</span>
                        <span>Modificado: {new Date(item.fecha_ultima_modificacion).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                          esCalculado
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {esCalculado && <CheckCircle2 size={12} />}
                        {item.estado}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all">
                        <Play size={14} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
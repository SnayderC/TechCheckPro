import React, { useEffect, useState } from 'react';
import { BarChart3, PieChart, RefreshCw, TrendingUp } from 'lucide-react';
import { toeService } from '../services/api';

function ExecutiveDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await toeService.getDashboardEjecutivo();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (loading) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center">
        <RefreshCw className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
        <p className="text-gray-400 text-sm">Cargando métricas ejecutivas...</p>
      </div>
    );
  }

  if (stats?.sin_datos) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-2">
        <BarChart3 className="text-gray-600 mx-auto" size={40} />
        <p className="text-gray-300 font-medium">Sin datos para el periodo actual</p>
        <p className="text-xs text-gray-500">Aún no hay evaluaciones finalizadas en el sistema.</p>
      </div>
    );
  }

  const dims = stats.promedios_dimensiones || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Dashboard Gerencial</h2>
          <p className="text-xs text-gray-400 mt-1">Métricas consolidadas de adopción FLOSS</p>
        </div>
        <button onClick={cargar} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total evaluados', val: stats.total_evaluados, color: 'text-blue-400' },
          { label: 'Aprobados (A)', val: stats.aprobados, color: 'text-emerald-400' },
          { label: 'Condicionados (B)', val: stats.condicionados, color: 'text-amber-400' },
          { label: 'Rechazados (C)', val: stats.rechazados, color: 'text-red-400' },
        ].map((c) => (
          <div key={c.label} className="glass p-5 rounded-2xl border border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{c.label}</span>
            <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart size={16} className="text-blue-400" /> Tasa de adopción aprobada
          </h3>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black text-emerald-400">{stats.porcentaje_aprobacion}%</span>
            <span className="text-xs text-gray-400 pb-2">de evaluaciones con CLASE A</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${stats.porcentaje_aprobacion}%` }}
            />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" /> Promedios por dimensión TOE
          </h3>
          {['Tecnologica', 'Organizacional', 'Economica'].map((dim) => (
            <div key={dim} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
              <span className="text-gray-400">{dim}</span>
              <span className={`font-bold ${stats.dimension_mas_critica === dim ? 'text-red-400' : 'text-white'}`}>
                {dims[dim]?.toFixed(1)}%
                {stats.dimension_mas_critica === dim && ' (crítica)'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboard;

import React from 'react';
import { Play, Shield, BarChart2, Layers } from 'lucide-react';

function Dashboard({ onNavigate }) {
  return (
    <div className="space-y-6">
      {/* Tarjeta principal con efecto Glow */}
      <div className="glass glow-blue rounded-2xl p-8 border border-gray-800">
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
          Reingeniería GUIOSPRO FLOSS
        </span>
        <h2 className="text-2xl font-bold text-white mt-3 mb-2">Bienvenido a TechCheck Pro</h2>
        <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
          Esta plataforma evoluciona el modelo original de evaluación multinivel para evaluar la viabilidad técnica, organizacional y económica de la adopción de Software Libre y Código Abierto (FLOSS) dentro de organizaciones.
        </p>
        <div className="mt-6">
          <button 
            onClick={onNavigate}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Play size={15} fill="currentColor" /> Iniciar Nueva Auditoría
          </button>
        </div>
      </div>

      {/* Grid de características técnicas y mitigación cognitiva */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-xl border border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/20">
            <Layers size={18} />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Modelo TOE Multidimensional</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Evaluación estructurada en las 3 dimensiones críticas: Tecnológica, Organizacional y Económica.
          </p>
        </div>

        <div className="glass p-5 rounded-xl border border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 border border-purple-500/20">
            <BarChart2 size={18} />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Usabilidad Cognitiva Optimizado</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Sustitución de controles deslizantes complejos por controles segmentados rápidos para evaluar 61 subfactores.
          </p>
        </div>

        <div className="glass p-5 rounded-xl border border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center mb-3 border border-green-500/20">
            <Shield size={18} />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Motor de Reglas y Dictamen</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Cálculo algorítmico de importancia global, alcances y dictamen final A, B o C sin sesgo humano.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import Report from './pages/Report';

function App() {
  // Estado para controlar en qué paso del Wizard se encuentra el evaluador
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'evaluation' | 'report'

  return (
    <div className="min-h-screen text-gray-100 bg-[#050505]">
      {/* Header global portado de prototipo.html */}
      <header className="border-b border-gray-800 bg-[#0a0a0a] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            T
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white uppercase">TechCheck Pro</h1>
            <p className="text-[10px] text-gray-500">Módulo de Inferencia de Adopción FLOSS (TOE)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Estado: Sincronizado
          </span>
        </div>
      </header>

      {/* Navegación por pasos (Wizard de pestañas) */}
      <nav className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-800 text-sm">
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`px-6 py-3 font-medium transition-all cursor-pointer ${
              currentTab === 'dashboard' 
                ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            1. Panel de Control & Alcance
          </button>
          <button 
            onClick={() => setCurrentTab('evaluation')}
            className={`px-6 py-3 font-medium transition-all cursor-pointer ${
              currentTab === 'evaluation' 
                ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            2. Matriz de Evaluación (61 ítems)
          </button>
          <button 
            onClick={() => setCurrentTab('report')}
            className={`px-6 py-3 font-medium transition-all cursor-pointer ${
              currentTab === 'report' 
                ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            3. Dictamen & Matriz FODA
          </button>
        </div>
      </nav>

      {/* Contenedor principal para renderizar las vistas */}
      <main className="max-w-6xl mx-auto p-4 mt-4 mb-12">
        {currentTab === 'dashboard' && <Dashboard onNavigate={() => setCurrentTab('evaluation')} />}
        {currentTab === 'evaluation' && <Evaluation onNext={() => setCurrentTab('report')} />}
        {currentTab === 'report' && <Report />}
      </main>
    </div>
  );
}

export default App;
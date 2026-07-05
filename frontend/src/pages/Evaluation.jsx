import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, HelpCircle, Layers, Sliders, RefreshCw } from 'lucide-react';
import { toeService } from '../services/api';

const DECISION_LEVELS = [
  { val: 0, label: 'Irrelevante' },
  { val: 1, label: 'Opcional' },
  { val: 2, label: 'Importante' },
  { val: 3, label: 'Fundamental' },
];

const LIKERT_LEVELS = [
  { val: 1, label: 'No cumple' },
  { val: 2, label: 'Desconoce' },
  { val: 3, label: 'Cumple parcial' },
  { val: 4, label: 'Cumple totalmente' },
];

function Evaluation({ onNext }) {
  // Estados para datos dinámicos desde PostgreSQL
  const [factores, setFactores] = useState([]);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ID de la evaluación activa
  const [evaluacionId, setEvaluacionId] = useState(1);

  // Almacenamiento de respuestas en memoria antes del autosave
  const [factorDecisions, setFactorDecisions] = useState({});
  const [subfactorScores, setSubfactorScores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // 1. Cargar el catálogo real desde Django al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        // Intentamos iniciar una evaluación en el backend y guardamos el ID en localStorage
        try {
          const evalRes = await toeService.iniciarEvaluacion({
            nombre: 'ERP Corporativo FLOSS',
            version: '2026.1',
            proveedor: 'Comunidad Abierta'
          });
          if (evalRes.evaluacion_id) {
            setEvaluacionId(evalRes.evaluacion_id);
            localStorage.setItem('activeEvalId', evalRes.evaluacion_id);
          }
        } catch (e) {
          console.log('Evaluación previa activa o modo desarrollo.');
        }

        // Consultamos el catálogo de ítems TOE
        const data = await toeService.getCatalogo();
        setFactores(data);
        
        if (data && data.length > 0) {
          setSelectedFactor(data[0]);
          
          // Inicializamos estados por defecto de decisiones
          const decIniciales = {};
          data.forEach(f => {
            decIniciales[f.id] = parseFloat(f.importancia_sugerida) || 2;
          });
          setFactorDecisions(decIniciales);
        }
        setError(null);
      } catch (err) {
        console.error('Error al conectar con Django API:', err);
        setError('No se pudo conectar con el servidor de base de datos. Verifique que Docker esté corriendo.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // 2. Manejador para Autosave asíncrono en PostgreSQL
  const dispararAutosave = async (nuevasDecisiones, nuevosPuntajes) => {
    setGuardando(true);
    try {
      const idActual = localStorage.getItem('activeEvalId') || evaluacionId;
      await toeService.guardarProgreso(idActual, nuevosPuntajes, nuevasDecisiones);
    } catch (err) {
      console.error('Fallo en autoguardado en segundo plano:', err);
    } finally {
      setTimeout(() => setGuardando(false), 500);
    }
  };

  const handleDecisionChange = (factorId, valNum) => {
    const nuevasDecisiones = { ...factorDecisions, [factorId]: valNum };
    setFactorDecisions(nuevasDecisiones);
    dispararAutosave(nuevasDecisiones, subfactorScores);
  };

  const handleScoreChange = (subfactorId, valNum) => {
    const nuevosPuntajes = { ...subfactorScores, [subfactorId]: valNum };
    setSubfactorScores(nuevosPuntajes);
    dispararAutosave(factorDecisions, nuevosPuntajes);
  };

  // Calcular porcentaje global de progreso real
  const totalSubfactores = factores.reduce((acc, f) => acc + (f.subfactores?.length || 0), 0);
  const contestados = Object.keys(subfactorScores).length;
  const porcentaje = totalSubfactores > 0 ? Math.round((contestados / totalSubfactores) * 100) : 0;

  if (loading) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-300 font-medium">Sincronizando con PostgreSQL y cargando los ítems TOE...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-center space-y-3">
        <p className="text-red-400 font-semibold">{error}</p>
        <p className="text-xs text-gray-400">Asegúrese de ejecutar: <code className="bg-black px-2 py-1 rounded">docker compose up -d</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra superior de progreso e instrucciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders size={18} className="text-blue-500" /> Matriz de Evaluación TOE ({totalSubfactores} Ítems Reales)
          </h2>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
            <span>Conectado a Base de Datos PostgreSQL.</span>
            {guardando && <span className="text-blue-400 animate-pulse font-medium">⏳ Autoguardando en el servidor...</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 font-semibold whitespace-nowrap">
            Progreso: {porcentaje}% ({contestados} / {totalSubfactores})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Selector de Factores Reales */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5">
            <Layers size={14} /> Factores por Auditar ({factores.length})
          </h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {factores.map((f) => {
              const isSelected = selectedFactor && selectedFactor.id === f.id;
              const currentVal = factorDecisions[f.id] !== undefined ? factorDecisions[f.id] : parseFloat(f.importancia_sugerida);
              const decisionLabel = DECISION_LEVELS.find(lvl => lvl.val === Math.round(currentVal))?.label || 'Importante';

              return (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFactor(f)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-600/10 border-blue-500/50 glow-blue' 
                      : 'glass border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {f.dimension_nombre || 'Dimensión'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Alcance: <strong className="text-gray-200">{f.alcance}</strong>
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white flex items-center justify-between">
                    {f.nombre_factor}
                    <span className="text-[11px] font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {decisionLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Evaluación Detallada del Factor Activo */}
        <div className="lg:col-span-8 space-y-4">
          {selectedFactor && (
            <>
              <div className="glass p-5 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                      {selectedFactor.dimension_nombre}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-2">{selectedFactor.nombre_factor}</h3>
                  </div>
                  <div className="text-xs bg-neutral-900 px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
                    Sugerida por guía: <strong className="text-white font-semibold">Valor {parseFloat(selectedFactor.importancia_sugerida)}</strong>
                  </div>
                </div>

                {/* Segmented Control para Importancia del Decisor */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-2 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-gray-400" /> Importancia asignada por el Decisor (Fuzzy Input):
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800">
                    {DECISION_LEVELS.map((item) => {
                      const currentVal = factorDecisions[selectedFactor.id] !== undefined ? factorDecisions[selectedFactor.id] : parseFloat(selectedFactor.importancia_sugerida);
                      const active = Math.round(currentVal) === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleDecisionChange(selectedFactor.id, item.val)}
                          className={`text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer ${
                            active 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Lista de Subfactores del Factor Reales */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  Calificación de Subfactores ({selectedFactor.subfactores?.length || 0} criterios)
                </h4>

                {selectedFactor.subfactores && selectedFactor.subfactores.map((sf, index) => {
                  const currentScore = subfactorScores[sf.id] || 0;

                  return (
                    <div key={sf.id} className="glass p-4 rounded-xl border border-gray-800 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-200 leading-relaxed">
                          <span className="text-blue-400 font-bold mr-2">{index + 1}.</span>
                          {sf.enunciado_pregunta}
                        </p>
                        {currentScore > 0 && (
                          <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                        )}
                      </div>

                      {/* Likert Scale (1-4) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {LIKERT_LEVELS.map((item) => {
                          const active = currentScore === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => handleScoreChange(sf.id, item.val)}
                              className={`text-[11px] font-semibold py-2 px-2 rounded-lg transition-all cursor-pointer border ${
                                active
                                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 glow-blue'
                                  : 'bg-[#0a0a0a] text-gray-400 border-gray-800/80 hover:border-gray-700 hover:text-gray-200'
                              }`}
                            >
                              <span className="block text-[9px] text-gray-500 font-normal">Valor {item.val}</span>
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Botón para pasar al Dictamen Final */}
          <div className="flex justify-end pt-4">
            <button 
              onClick={async () => {
                try {
                  const idActual = localStorage.getItem('activeEvalId') || evaluacionId;
                  await toeService.calcularDictamen(idActual);
                } catch (e) {
                  console.error('Error procesando dictamen:', e);
                }
                onNext();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              Procesar Inferencia & Ver Dictamen <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Evaluation;
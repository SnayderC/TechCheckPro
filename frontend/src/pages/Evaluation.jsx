import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, HelpCircle, Layers, Sliders } from 'lucide-react';

// Datos estáticos portados del modelo TOE original para maquetar la usabilidad
const MOCK_FACTORS = [
  { id: 'compatibilidad', name: 'Compatibilidad', dim: 'Tecnológica', suggested: 'Importante', scope: 'Externo' },
  { id: 'personalizacion', name: 'Personalización', dim: 'Tecnológica', suggested: 'Importante', scope: 'Externo' },
  { id: 'fiabilidad', name: 'Fiabilidad', dim: 'Tecnológica', suggested: 'Importante', scope: 'Externo' },
  { id: 'usabilidad', name: 'Usabilidad', dim: 'Tecnológica', suggested: 'Importante', scope: 'Externo' },
  { id: 'formacion', name: 'Formación', dim: 'Organizacional', suggested: 'Importante', scope: 'Interno' },
  { id: 'coste', name: 'Coste total de propiedad', dim: 'Económica', suggested: 'Importante', scope: 'Interno' },
];

const MOCK_SUBFACTORS = [
  { id: 1, text: 'Una empresa proporciona una infraestructura de nube lista para usar para este software.' },
  { id: 2, text: 'Los programas informáticos pueden exportar formatos propietarios comunes.' },
  { id: 3, text: 'El software interactúa y se integra sin conflictos con el software propietario existente.' },
  { id: 4, text: 'El software está certificado y cumple con los estándares para operar en su nicho de mercado.' },
  { id: 5, text: 'El software es compatible con los casos de uso y las funcionalidades corporativas más comunes.' },
  { id: 6, text: 'El software utiliza formatos estándar abiertos e interoperables.' },
];

const DECISION_LEVELS = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'];
const LIKERT_LEVELS = [
  { val: 1, label: 'No cumple' },
  { val: 2, label: 'Desconoce' },
  { val: 3, label: 'Cumple parcial' },
  { val: 4, label: 'Cumple totalmente' },
];

function Evaluation({ onNext }) {
  const [selectedFactor, setSelectedFactor] = useState(MOCK_FACTORS[0]);
  const [factorDecisions, setFactorDecisions] = useState({ compatibilidad: 'Importante' });
  const [subfactorScores, setSubfactorScores] = useState({ 1: 3, 2: 4, 3: 3 });

  const handleDecisionChange = (factorId, level) => {
    setFactorDecisions(prev => ({ ...prev, [factorId]: level }));
  };

  const handleScoreChange = (subfactorId, val) => {
    setSubfactorScores(prev => ({ ...prev, [subfactorId]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de progreso e instrucciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders size={18} className="text-blue-500" /> Matriz de Evaluación TOE (61 Ítems)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Mitigación cognitiva activa: seleccione un factor y califique sus subfactores mediante controles segmentados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 font-semibold whitespace-nowrap">
            Progreso: 45% (28 / 61 Subfactores)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Selector de Factores */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5">
            <Layers size={14} /> Factores por Auditar
          </h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {MOCK_FACTORS.map((f) => {
              const isSelected = selectedFactor.id === f.id;
              const currentDecision = factorDecisions[f.id] || 'Importante';

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
                      {f.dim}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Alcance: <strong className="text-gray-200">{f.scope}</strong>
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white flex items-center justify-between">
                    {f.name}
                    <span className="text-[11px] font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {currentDecision}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Evaluación Detallada del Factor Seleccionado */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  Evaluando Factor Activo
                </span>
                <h3 className="text-xl font-bold text-white mt-2">{selectedFactor.name}</h3>
              </div>
              <div className="text-xs bg-neutral-900 px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
                Sugerida por guía: <strong className="text-white font-semibold">{selectedFactor.suggested}</strong>
              </div>
            </div>

            {/* Segmented Control para Importancia del Decisor */}
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-2 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-gray-400" /> Importancia asignada por el Decisor (Evaluador):
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800">
                {DECISION_LEVELS.map((level) => {
                  const active = (factorDecisions[selectedFactor.id] || 'Importante') === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleDecisionChange(selectedFactor.id, level)}
                      className={`text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer ${
                        active 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lista de Subfactores a calificar */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Calificación de Subfactores ({MOCK_SUBFACTORS.length} criterios)
            </h4>

            {MOCK_SUBFACTORS.map((sf, index) => {
              const currentScore = subfactorScores[sf.id] || 0;

              return (
                <div key={sf.id} className="glass p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-200 leading-relaxed">
                      <span className="text-blue-400 font-bold mr-2">{index + 1}.</span>
                      {sf.text}
                    </p>
                    {currentScore > 0 && (
                      <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Likert Scale (Segmented Control 1-4) */}
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

          {/* Botón para pasar al Dictamen Final */}
          <div className="flex justify-end pt-4">
            <button 
              onClick={onNext}
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
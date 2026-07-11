import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Layers,
  Sliders,
  RefreshCw,
  Search,
  AlertCircle,
} from 'lucide-react';
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

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'completados', label: 'Completados' },
];

function Evaluation({ onNext, onSyncChange }) {
  const [factores, setFactores] = useState([]);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluacionId, setEvaluacionId] = useState(null);
  const [evaluacionEstado, setEvaluacionEstado] = useState('En Progreso');
  const [softwareNombre, setSoftwareNombre] = useState('');

  const [factorDecisions, setFactorDecisions] = useState({});
  const [subfactorScores, setSubfactorScores] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [procesando, setProcesando] = useState(false);
  const [calcularError, setCalcularError] = useState(null);

  const autosaveTimer = useRef(null);

  const updateSync = useCallback(
    (status) => {
      setSyncStatus(status);
      onSyncChange?.(status);
    },
    [onSyncChange],
  );

  useEffect(() => {
    const cargarDatos = async () => {
      const evalId = localStorage.getItem('activeEvalId');
      if (!evalId) {
        setError('No hay una auditoría activa. Registre o seleccione un proyecto en el Panel de Control.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setEvaluacionId(Number(evalId));

        const [catalogo, detalle] = await Promise.all([
          toeService.getCatalogo(),
          toeService.getEvaluacionDetalle(evalId),
        ]);

        setFactores(catalogo);
        setEvaluacionEstado(detalle.estado);
        setSoftwareNombre(detalle.software?.nombre || '');

        const puntajes = {};
        Object.entries(detalle.puntajes || {}).forEach(([id, val]) => {
          puntajes[id] = Number(val);
        });
        setSubfactorScores(puntajes);

        const decisiones = {};
        catalogo.forEach((f) => {
          const guardada = detalle.decisiones?.[String(f.id)];
          decisiones[f.id] = guardada !== undefined ? Number(guardada) : parseFloat(f.importancia_sugerida) || 2;
        });
        setFactorDecisions(decisiones);

        if (catalogo.length > 0) {
          setSelectedFactor(catalogo[0]);
        }
        setError(null);
      } catch (err) {
        console.error('Error al cargar evaluación:', err);
        setError('No se pudo cargar la evaluación. Verifique su conexión o seleccione otra auditoría.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const dispararAutosave = useCallback(
    (nuevasDecisiones, nuevosPuntajes) => {
      if (evaluacionEstado === 'Calculado') return;

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      updateSync('saving');

      autosaveTimer.current = setTimeout(async () => {
        try {
          await toeService.guardarProgreso(evaluacionId, nuevosPuntajes, nuevasDecisiones);
          updateSync('saved');
          setTimeout(() => updateSync('idle'), 2000);
        } catch (err) {
          console.error('Fallo en autoguardado:', err);
          updateSync('error');
        }
      }, 400);
    },
    [evaluacionId, evaluacionEstado, updateSync],
  );

  const handleDecisionChange = (factorId, valNum) => {
    if (evaluacionEstado === 'Calculado') return;
    const nuevasDecisiones = { ...factorDecisions, [factorId]: valNum };
    setFactorDecisions(nuevasDecisiones);
    dispararAutosave(nuevasDecisiones, subfactorScores);
  };

  const handleScoreChange = (subfactorId, valNum) => {
    if (evaluacionEstado === 'Calculado') return;
    const nuevosPuntajes = { ...subfactorScores, [subfactorId]: valNum };
    setSubfactorScores(nuevosPuntajes);
    dispararAutosave(factorDecisions, nuevosPuntajes);
  };

  const todosSubfactores = useMemo(() => {
    return factores.flatMap((f) =>
      (f.subfactores || []).map((sf) => ({
        ...sf,
        factorId: f.id,
        factorNombre: f.nombre_factor,
        dimensionNombre: f.dimension_nombre,
        alcance: f.alcance,
      })),
    );
  }, [factores]);

  const subfactoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return todosSubfactores.filter((sf) => {
      const puntaje = subfactorScores[sf.id] ?? 1;
      const esPendiente = puntaje <= 1;
      const esCompletado = puntaje > 1;

      if (filtroEstado === 'pendientes' && !esPendiente) return false;
      if (filtroEstado === 'completados' && !esCompletado) return false;

      if (!termino) return true;
      return (
        sf.enunciado_pregunta.toLowerCase().includes(termino) ||
        sf.factorNombre.toLowerCase().includes(termino) ||
        sf.dimensionNombre.toLowerCase().includes(termino)
      );
    });
  }, [todosSubfactores, subfactorScores, busqueda, filtroEstado]);

  const totalSubfactores = todosSubfactores.length;
  const completados = todosSubfactores.filter(
    (sf) => (subfactorScores[sf.id] ?? 1) > 1,
  ).length;
  const porcentaje = totalSubfactores > 0 ? Math.round((completados / totalSubfactores) * 100) : 0;

  const factoresConCoincidencias = useMemo(() => {
    if (!busqueda.trim()) return factores;
    const ids = new Set(subfactoresFiltrados.map((sf) => sf.factorId));
    return factores.filter((f) => ids.has(f.id));
  }, [factores, busqueda, subfactoresFiltrados]);

  const handleCalcular = async () => {
    setCalcularError(null);
    setProcesando(true);
    try {
      await toeService.calcularDictamen(evaluacionId);
      onNext();
    } catch (err) {
      console.error('Error procesando dictamen:', err);
      setCalcularError('No se pudo calcular el dictamen. Intente nuevamente.');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-300 font-medium">Cargando catálogo TOE y progreso guardado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="text-red-400 mx-auto" size={36} />
        <p className="text-red-400 font-semibold">{error}</p>
      </div>
    );
  }

  const modoBusqueda = busqueda.trim().length > 0 || filtroEstado !== 'todos';
  const soloLectura = evaluacionEstado === 'Calculado';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders size={18} className="text-blue-500" />
            Matriz de Evaluación TOE ({totalSubfactores} ítems)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {softwareNombre && <>Auditoría: <strong className="text-gray-200">{softwareNombre}</strong> · </>}
            ID #{evaluacionId}
            {soloLectura && (
              <span className="ml-2 text-amber-400 font-medium">(Solo lectura — ya calculada)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 font-semibold whitespace-nowrap">
            Progreso: {porcentaje}% ({completados} / {totalSubfactores})
          </span>
        </div>
      </div>

      {/* Buscador y filtros RF-02/RF-04 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar subfactor, factor o dimensión..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1.5 bg-[#0a0a0a] p-1 rounded-xl border border-gray-800">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroEstado(f.id)}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                filtroEstado === f.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar de factores */}
        {!modoBusqueda && (
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5">
              <Layers size={14} /> Factores ({factores.length})
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {factoresConCoincidencias.map((f) => {
                const isSelected = selectedFactor?.id === f.id;
                const currentVal = factorDecisions[f.id] ?? parseFloat(f.importancia_sugerida);
                const decisionLabel =
                  DECISION_LEVELS.find((lvl) => lvl.val === Math.round(currentVal))?.label || 'Importante';
                const sfDelFactor = f.subfactores || [];
                const completadosFactor = sfDelFactor.filter(
                  (sf) => (subfactorScores[sf.id] ?? 1) > 1,
                ).length;

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
                        {f.dimension_nombre}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {completadosFactor}/{sfDelFactor.length}
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
        )}

        {/* Panel principal */}
        <div className={modoBusqueda ? 'lg:col-span-12' : 'lg:col-span-8'}>
          {modoBusqueda ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Mostrando {subfactoresFiltrados.length} de {totalSubfactores} ítems
              </p>
              {subfactoresFiltrados.length === 0 ? (
                <div className="glass p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
                  No hay ítems que coincidan con la búsqueda o filtro seleccionado.
                </div>
              ) : (
                subfactoresFiltrados.map((sf, index) => (
                  <SubfactorCard
                    key={sf.id}
                    sf={sf}
                    index={index}
                    currentScore={subfactorScores[sf.id] ?? 0}
                    onScoreChange={handleScoreChange}
                    soloLectura={soloLectura}
                    showFactorMeta
                  />
                ))
              )}
            </div>
          ) : (
            selectedFactor && (
              <>
                <div className="glass p-5 rounded-2xl border border-gray-800 space-y-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                        {selectedFactor.dimension_nombre}
                      </span>
                      <h3 className="text-xl font-bold text-white mt-2">{selectedFactor.nombre_factor}</h3>
                    </div>
                    <div className="text-xs bg-neutral-900 px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
                      Sugerida: <strong className="text-white">{parseFloat(selectedFactor.importancia_sugerida)}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-2 flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-gray-400" />
                      Importancia asignada por el Decisor:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800">
                      {DECISION_LEVELS.map((item) => {
                        const currentVal =
                          factorDecisions[selectedFactor.id] ?? parseFloat(selectedFactor.importancia_sugerida);
                        const active = Math.round(currentVal) === item.val;
                        return (
                          <button
                            key={item.val}
                            type="button"
                            disabled={soloLectura}
                            onClick={() => handleDecisionChange(selectedFactor.id, item.val)}
                            className={`text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

                <div className="space-y-3">
                  {(selectedFactor.subfactores || []).map((sf, index) => (
                    <SubfactorCard
                      key={sf.id}
                      sf={sf}
                      index={index}
                      currentScore={subfactorScores[sf.id] ?? 0}
                      onScoreChange={handleScoreChange}
                      soloLectura={soloLectura}
                    />
                  ))}
                </div>
              </>
            )
          )}

          <div className="flex flex-col items-end gap-2 pt-6">
            {calcularError && (
              <p className="text-red-400 text-xs font-medium">{calcularError}</p>
            )}
            <button
              onClick={handleCalcular}
              disabled={procesando || soloLectura}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {procesando ? (
                <>
                  <RefreshCw className="animate-spin" size={15} /> Procesando...
                </>
              ) : (
                <>
                  Procesar Inferencia & Ver Dictamen <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador flotante de autosave RF-04 */}
      {syncStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md ${
              syncStatus === 'saving'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : syncStatus === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {syncStatus === 'saving' && '⏳ Autoguardando...'}
            {syncStatus === 'saved' && '✓ Guardado'}
            {syncStatus === 'error' && '✗ Error al guardar'}
          </div>
        </div>
      )}
    </div>
  );
}

function SubfactorCard({ sf, index, currentScore, onScoreChange, soloLectura, showFactorMeta }) {
  return (
    <div className="glass p-4 rounded-xl border border-gray-800 space-y-3">
      {showFactorMeta && (
        <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider">
          <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {sf.dimensionNombre}
          </span>
          <span className="text-gray-400">{sf.factorNombre}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs sm:text-sm font-medium text-gray-200 leading-relaxed">
          <span className="text-blue-400 font-bold mr-2">{index + 1}.</span>
          {sf.enunciado_pregunta}
        </p>
        {currentScore > 1 && (
          <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {LIKERT_LEVELS.map((item) => {
          const active = currentScore === item.val;
          return (
            <button
              key={item.val}
              type="button"
              disabled={soloLectura}
              onClick={() => onScoreChange(sf.id, item.val)}
              className={`text-[11px] font-semibold py-2 px-2 rounded-lg transition-all cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
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
}

export default Evaluation;

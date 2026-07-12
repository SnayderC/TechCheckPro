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
import { toeService, wizardCache } from '../services/api';
import {
  DECISION_LEVELS,
  calcularImportanciaRelativa,
  esFactorRelevante,
  etiquetaImportancia,
  normalizarNivel,
} from '../utils/guiosadCalculos';

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
  const [respondidos, setRespondidos] = useState({});
  const [pendientesMsg, setPendientesMsg] = useState(null);

  const autosaveTimer = useRef(null);
  const autosavePromise = useRef(null);

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

        const respMap = {};
        Object.entries(detalle.respondidos || {}).forEach(([id, val]) => {
          respMap[id] = Boolean(val);
        });
        setRespondidos(respMap);

        const cache = wizardCache.load(evalId);
        if (cache?.puntajes) {
          setSubfactorScores((prev) => ({ ...prev, ...cache.puntajes }));
          if (cache.decisiones) setFactorDecisions((prev) => ({ ...prev, ...cache.decisiones }));
          if (cache.respondidos) {
            setRespondidos((prev) => ({ ...prev, ...cache.respondidos }));
          }
        }

        const decisiones = {};
        catalogo.forEach((f) => {
          const guardada = detalle.decisiones?.[String(f.id)];
          decisiones[f.id] = guardada !== undefined
            ? normalizarNivel(guardada)
            : normalizarNivel(f.importancia_sugerida);
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

  const guardarEnServidor = useCallback(
    async (nuevasDecisiones, nuevosPuntajes, nuevosRespondidos) => {
      const promesa = toeService.guardarProgreso(
        evaluacionId,
        nuevosPuntajes,
        nuevasDecisiones,
        nuevosRespondidos,
      );
      autosavePromise.current = promesa;
      try {
        await promesa;
        updateSync('saved');
        setTimeout(() => updateSync('idle'), 2000);
      } catch (err) {
        console.error('Fallo en autoguardado:', err);
        updateSync('offline');
        throw err;
      } finally {
        if (autosavePromise.current === promesa) {
          autosavePromise.current = null;
        }
      }
    },
    [evaluacionId, updateSync],
  );

  const dispararAutosave = useCallback(
    (nuevasDecisiones, nuevosPuntajes, nuevosRespondidos) => {
      if (evaluacionEstado === 'Calculado' || evaluacionEstado === 'Bloqueado') return;

      wizardCache.save(evaluacionId, {
        puntajes: nuevosPuntajes,
        decisiones: nuevasDecisiones,
        respondidos: nuevosRespondidos,
      });

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      updateSync('saving');

      autosaveTimer.current = setTimeout(() => {
        guardarEnServidor(nuevasDecisiones, nuevosPuntajes, nuevosRespondidos);
      }, 400);
    },
    [evaluacionId, evaluacionEstado, updateSync, guardarEnServidor],
  );

  const handleDecisionChange = (factorId, valNum) => {
    if (evaluacionEstado === 'Calculado' || evaluacionEstado === 'Bloqueado') return;
    const nuevasDecisiones = { ...factorDecisions, [factorId]: valNum };
    setFactorDecisions(nuevasDecisiones);
    dispararAutosave(nuevasDecisiones, subfactorScores, respondidos);
  };

  const handleScoreChange = (subfactorId, valNum) => {
    if (evaluacionEstado === 'Calculado' || evaluacionEstado === 'Bloqueado') return;
    const nuevosPuntajes = { ...subfactorScores, [subfactorId]: valNum };
    const nuevosRespondidos = { ...respondidos, [subfactorId]: true };
    setSubfactorScores(nuevosPuntajes);
    setRespondidos(nuevosRespondidos);
    dispararAutosave(factorDecisions, nuevosPuntajes, nuevosRespondidos);
  };

  const factorMeta = useMemo(() => {
    const meta = {};
    factores.forEach((f) => {
      const isVal = normalizarNivel(f.importancia_sugerida);
      const idVal = normalizarNivel(factorDecisions[f.id] ?? f.importancia_sugerida);
      const ir = calcularImportanciaRelativa(isVal, idVal);
      meta[f.id] = {
        isVal,
        idVal,
        ir,
        relevante: esFactorRelevante(ir.valor),
      };
    });
    return meta;
  }, [factores, factorDecisions]);

  const todosSubfactores = useMemo(() => {
    return factores.flatMap((f) => {
      if (!factorMeta[f.id]?.relevante) return [];
      return (f.subfactores || []).map((sf) => ({
        ...sf,
        factorId: f.id,
        factorNombre: f.nombre_factor,
        dimensionNombre: f.dimension_nombre,
        alcance: f.alcance,
      }));
    });
  }, [factores, factorMeta]);

  const subfactoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return todosSubfactores.filter((sf) => {
      const puntaje = subfactorScores[sf.id] ?? 1;
      const esPendiente = !respondidos[sf.id];
      const esCompletado = respondidos[sf.id];

      if (filtroEstado === 'pendientes' && !esPendiente) return false;
      if (filtroEstado === 'completados' && !esCompletado) return false;

      if (!termino) return true;
      return (
        sf.enunciado_pregunta.toLowerCase().includes(termino) ||
        sf.factorNombre.toLowerCase().includes(termino) ||
        sf.dimensionNombre.toLowerCase().includes(termino)
      );
    });
  }, [todosSubfactores, subfactorScores, respondidos, busqueda, filtroEstado]);

  const totalSubfactores = todosSubfactores.length;
  const completados = todosSubfactores.filter((sf) => respondidos[sf.id]).length;
  const porcentaje = totalSubfactores > 0 ? Math.round((completados / totalSubfactores) * 100) : 0;
  const puedeCalcular = totalSubfactores > 0 && completados === totalSubfactores;

  const factoresConCoincidencias = useMemo(() => {
    if (!busqueda.trim()) return factores;
    const ids = new Set(subfactoresFiltrados.map((sf) => sf.factorId));
    return factores.filter((f) => ids.has(f.id));
  }, [factores, busqueda, subfactoresFiltrados]);

  const handleCalcular = async () => {
    setCalcularError(null);
    setPendientesMsg(null);

    if (!puedeCalcular) {
      const faltan = totalSubfactores - completados;
      setPendientesMsg(
        `Debe calificar explícitamente todos los subfactores relevantes. Faltan ${faltan}.`,
      );
      return;
    }

    setProcesando(true);
    try {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      if (autosavePromise.current) {
        await autosavePromise.current;
      } else {
        await guardarEnServidor(factorDecisions, subfactorScores, respondidos);
      }

      await toeService.calcularDictamen(evaluacionId);
      wizardCache.clear(evaluacionId);
      onNext();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'completitud_incompleta') {
        setPendientesMsg(data.mensaje || 'Faltan subfactores por calificar.');
      } else {
        setCalcularError(data?.error || 'No se pudo calcular el dictamen.');
      }
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-300 font-medium">Cargando evaluación...</p>
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
  const soloLectura = evaluacionEstado === 'Calculado' || evaluacionEstado === 'Bloqueado';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders size={18} className="text-blue-500" />
            Matriz de Evaluación TOE ({todosSubfactores.length} ítems relevantes)
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
        {!modoBusqueda && (
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5">
              <Layers size={14} /> Factores ({factores.length})
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {factoresConCoincidencias.map((f) => {
                const isSelected = selectedFactor?.id === f.id;
                const meta = factorMeta[f.id];
                const sfDelFactor = meta?.relevante ? f.subfactores || [] : [];
                const completadosFactor = sfDelFactor.filter((sf) => respondidos[sf.id]).length;

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFactor(f)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50 glow-blue'
                        : 'glass border-gray-800 hover:border-gray-700'
                    } ${!meta?.relevante ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {f.dimension_nombre}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {meta?.relevante ? `${completadosFactor}/${sfDelFactor.length}` : '—'}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-white flex items-center justify-between gap-2">
                      <span>{f.nombre_factor}</span>
                      <span
                        className={`text-[10px] font-normal px-2 py-0.5 rounded shrink-0 ${
                          meta?.relevante
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-gray-500 bg-gray-800'
                        }`}
                      >
                        IR: {meta?.ir.etiqueta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    currentScore={subfactorScores[sf.id] ?? 1}
                    calificado={respondidos[sf.id]}
                    onScoreChange={handleScoreChange}
                    soloLectura={soloLectura}
                    showFactorMeta
                  />
                ))
              )}
            </div>
          ) : selectedFactor ? (
            <FactorDetailPanel
              factor={selectedFactor}
              meta={factorMeta[selectedFactor.id]}
              idVal={normalizarNivel(factorDecisions[selectedFactor.id] ?? selectedFactor.importancia_sugerida)}
              subfactorScores={subfactorScores}
              respondidos={respondidos}
              soloLectura={soloLectura}
              onDecisionChange={handleDecisionChange}
              onScoreChange={handleScoreChange}
            />
          ) : null}

          <div className="flex flex-col items-end gap-2 pt-6">
            {!puedeCalcular && !soloLectura && totalSubfactores > 0 && (
              <p className="text-gray-400 text-xs text-right max-w-md">
                Califique los {totalSubfactores - completados} subfactores pendientes
                (debe seleccionar una opción en cada uno) antes de calcular el dictamen.
              </p>
            )}
            {pendientesMsg && (
              <p className="text-amber-400 text-xs font-medium bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
                {pendientesMsg}
              </p>
            )}
            {calcularError && (
              <p className="text-red-400 text-xs font-medium">{calcularError}</p>
            )}
            <button
              onClick={handleCalcular}
              disabled={procesando || soloLectura || !puedeCalcular}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {procesando ? (
                <>
                  <RefreshCw className="animate-spin" size={15} /> Procesando...
                </>
              ) : (
                <>
                  Calcular dictamen <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {syncStatus !== 'idle' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md ${
              syncStatus === 'saving'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : syncStatus === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : syncStatus === 'offline'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {syncStatus === 'saving' && '⏳ Autoguardando...'}
            {syncStatus === 'saved' && '✓ Guardado'}
            {syncStatus === 'offline' && '⚠ Progreso guardado temporalmente'}
            {syncStatus === 'error' && '✗ Error al guardar'}
          </div>
        </div>
      )}
    </div>
  );
}

function FactorDetailPanel({
  factor,
  meta,
  idVal,
  subfactorScores,
  respondidos,
  soloLectura,
  onDecisionChange,
  onScoreChange,
}) {
  const isVal = meta?.isVal ?? normalizarNivel(factor.importancia_sugerida);
  const ir = meta?.ir ?? calcularImportanciaRelativa(isVal, idVal);
  const factorRelevante = meta?.relevante ?? esFactorRelevante(ir.valor);

  return (
    <>
      <div className="glass p-5 rounded-2xl border border-gray-800 space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
              {factor.dimension_nombre}
            </span>
            <h3 className="text-xl font-bold text-white mt-2">{factor.nombre_factor}</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="bg-neutral-900 px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
              Sugerida: <strong className="text-white">{etiquetaImportancia(isVal)}</strong>
            </div>
            <div className="bg-neutral-900 px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
              Decisor: <strong className="text-white">{etiquetaImportancia(idVal)}</strong>
            </div>
            <div
              className={`px-3 py-2 rounded-xl border text-gray-300 ${
                factorRelevante ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-900 border-gray-800'
              }`}
            >
              Relativa: <strong className="text-white">{ir.etiqueta}</strong>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300 block mb-2 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-gray-400" />
            Evaluación del Decisor
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0a0a0a] p-1.5 rounded-xl border border-gray-800">
            {DECISION_LEVELS.map((item) => {
              const active = idVal === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  disabled={soloLectura}
                  onClick={() => onDecisionChange(factor.id, item.val)}
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

      {!factorRelevante ? (
        <div className="glass p-8 rounded-2xl border border-gray-800 text-center space-y-2">
          <p className="text-sm text-gray-300 font-medium">Factor no relevante para esta auditoría</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Con importancia relativa <strong className="text-gray-400">Irrelevante</strong>, este factor no participa
            en el análisis. Ajuste la evaluación del decisor si desea incluirlo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(factor.subfactores || []).map((sf, index) => (
            <SubfactorCard
              key={sf.id}
              sf={sf}
              index={index}
              currentScore={subfactorScores[sf.id] ?? 1}
              calificado={respondidos[sf.id]}
              onScoreChange={onScoreChange}
              soloLectura={soloLectura}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SubfactorCard({ sf, index, currentScore, calificado, onScoreChange, soloLectura, showFactorMeta }) {
  return (
    <div className={`glass p-4 rounded-xl border space-y-3 ${
      calificado ? 'border-gray-800' : 'border-amber-500/30 bg-amber-500/5'
    }`}>
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
        {calificado ? (
          <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
        ) : (
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
            Pendiente
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {LIKERT_LEVELS.map((item) => {
          const active = calificado && currentScore === item.val;
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

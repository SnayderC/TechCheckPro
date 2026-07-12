import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { toeService } from '../services/api';

function WhatIf() {
  const [evaluacionId, setEvaluacionId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [factores, setFactores] = useState([]);
  const [puntajes, setPuntajes] = useState({});
  const [decisiones, setDecisiones] = useState({});
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const evalId = localStorage.getItem('activeEvalId');
    if (!evalId) return;
    setEvaluacionId(Number(evalId));

    Promise.all([
      toeService.getEvaluacionDetalle(evalId),
      toeService.getCatalogo(),
    ]).then(([det, cat]) => {
      setDetalle(det);
      setFactores(cat);
      setPuntajes(det.puntajes || {});
      const dec = {};
      cat.forEach((f) => {
        dec[f.id] = det.decisiones?.[String(f.id)] ?? f.importancia_sugerida;
      });
      setDecisiones(dec);
    });
  }, []);

  const simular = useCallback(async () => {
    if (!evaluacionId) return;
    setLoading(true);
    try {
      const res = await toeService.simular(evaluacionId, puntajes, decisiones);
      setResultado(res);
    } finally {
      setLoading(false);
    }
  }, [evaluacionId, puntajes, decisiones]);

  useEffect(() => {
    const t = setTimeout(simular, 500);
    return () => clearTimeout(t);
  }, [simular]);

  if (!evaluacionId) {
    return (
      <div className="glass p-8 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
        Seleccione una auditoría en el Panel de Control para simular escenarios.
      </div>
    );
  }

  const subfactores = factores.flatMap((f) =>
    (f.subfactores || []).slice(0, 1).map((sf) => ({ ...sf, factorNombre: f.nombre_factor })),
  ).slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FlaskConical size={20} className="text-purple-400" /> Simulador What-If
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Altere calificaciones temporalmente — el registro original no se modifica.
        </p>
      </div>

      <div className="glass p-5 rounded-2xl border border-gray-800 space-y-3 max-h-64 overflow-y-auto">
        <p className="text-xs text-gray-500 uppercase font-bold">Ajuste rápido (muestra)</p>
        {subfactores.map((sf) => (
          <div key={sf.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-gray-300 truncate flex-1">{sf.enunciado_pregunta.slice(0, 60)}...</span>
            <select
              value={puntajes[sf.id] ?? 1}
              onChange={(e) => setPuntajes({ ...puntajes, [sf.id]: Number(e.target.value) })}
              className="bg-[#0a0a0a] border border-gray-800 rounded-lg px-2 py-1 text-white"
            >
              {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>

      {loading && <RefreshCw className="animate-spin text-blue-500 mx-auto" size={20} />}

      {resultado && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass p-5 rounded-2xl border border-gray-700">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Dictamen real</p>
            <p className="text-2xl font-black text-white">{resultado.original.clase_dictamen}</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5">
            <p className="text-[10px] uppercase font-bold text-purple-400 mb-2">Dictamen simulado</p>
            <p className="text-2xl font-black text-purple-300">{resultado.simulado.clase_dictamen}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatIf;

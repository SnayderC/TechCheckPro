import React, { useEffect, useState } from 'react';
import { GitCompare, RefreshCw } from 'lucide-react';
import { toeService } from '../services/api';

function Compare() {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    toeService.getMisEvaluaciones().then((all) => {
      const fin = all.filter((e) => e.estado === 'Calculado' || e.estado === 'Bloqueado');
      setEvaluaciones(fin);
    });
  }, []);

  const comparar = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await toeService.comparar(selA, selB);
      setResultado(res);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo comparar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const finalizadas = evaluaciones.filter((e) => e.estado === 'Calculado' || e.estado === 'Bloqueado');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitCompare size={20} className="text-blue-400" /> Comparar Alternativas
        </h2>
        <p className="text-xs text-gray-400 mt-1">Seleccione dos softwares auditados para contrastar viabilidad.</p>
      </div>

      <div className="glass p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Software A</label>
          <select
            value={selA}
            onChange={(e) => setSelA(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">Seleccionar...</option>
            {finalizadas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.software?.nombre} (#{e.id}) — {e.clase_dictamen || e.estado}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Software B</label>
          <select
            value={selB}
            onChange={(e) => setSelB(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white"
          >
            <option value="">Seleccionar...</option>
            {finalizadas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.software?.nombre} (#{e.id}) — {e.clase_dictamen || e.estado}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={comparar}
        disabled={!selA || !selB || loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center gap-2"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <GitCompare size={16} />}
        Comparar
      </button>

      {resultado && (
        <div className="glass p-6 rounded-2xl border border-gray-800 space-y-4 overflow-x-auto">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="font-bold text-white">{resultado.evaluacion_a.software.nombre}</p>
              <p className="text-blue-400 font-black text-lg mt-1">{resultado.evaluacion_a.clase_dictamen}</p>
            </div>
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
              <p className="font-bold text-white">{resultado.evaluacion_b.software.nombre}</p>
              <p className="text-purple-400 font-black text-lg mt-1">{resultado.evaluacion_b.clase_dictamen}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                <th className="py-2 text-left">Dimensión</th>
                <th className="py-2 text-center">Software A</th>
                <th className="py-2 text-center">Software B</th>
                <th className="py-2 text-right">Mejor opción</th>
              </tr>
            </thead>
            <tbody>
              {resultado.comparativa.map((row) => (
                <tr key={row.dimension} className="border-b border-gray-800/50">
                  <td className="py-3 text-gray-300">{row.dimension}</td>
                  <td className="py-3 text-center font-mono">{row.software_a.toFixed(1)}%</td>
                  <td className="py-3 text-center font-mono">{row.software_b.toFixed(1)}%</td>
                  <td className={`py-3 text-right font-bold ${row.mejor === 'A' ? 'text-emerald-400' : row.mejor === 'B' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {row.mejor === 'Empate' ? 'Empate' : `Software ${row.mejor}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Compare;

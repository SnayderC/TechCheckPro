import React, { useState, useEffect } from 'react';
import { 
  Download, ShieldCheck, AlertTriangle, XCircle, Award, 
  Calendar, User, Clock, FileCheck, Layers, RefreshCw 
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { toeService } from '../services/api';

function Report() {
  const [evaluacion, setEvaluacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDictamenReal = async () => {
      try {
        setLoading(true);
        // Pedimos al motor backend que calcule y retorne la evaluación #1 activa
        const data = await toeService.calcularDictamen(1);
        setEvaluacion(data);
        setError(null);
      } catch (err) {
        console.error('Error al obtener dictamen de Django:', err);
        setError('No se pudo calcular el dictamen. Asegúrese de haber calificado ítems en la pestaña anterior.');
      } finally {
        setLoading(false);
      }
    };

    cargarDictamenReal();
  }, []);

  if (loading) {
    return (
      <div className="glass p-12 rounded-2xl border border-gray-800 text-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-300 font-medium">Ejecutando motor de inferencia matemática FODA en Django...</p>
      </div>
    );
  }

  if (error || !evaluacion) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-center space-y-3">
        <p className="text-red-400 font-semibold">{error || 'Sin datos de evaluación'}</p>
      </div>
    );
  }

  // 1. Formatear datos para el Gráfico de Radar TOE dinámico
  const radarData = [
    { dimension: 'Tecnológica', cumplimiento: parseFloat(evaluacion.promedio_T) || 0, fullMark: 100 },
    { dimension: 'Organizacional', cumplimiento: parseFloat(evaluacion.promedio_O) || 0, fullMark: 100 },
    { dimension: 'Económica', cumplimiento: parseFloat(evaluacion.promedio_E) || 0, fullMark: 100 },
  ];

  // 2. Contabilizar métricas FODA reales de la tabla DetalleEvaluacionFactor
  const detalles = evaluacion.detalles_factor || [];
  const fortalezasCount = detalles.filter(d => d.resultado_foda === 'Fortaleza').length;
  const oportunidadesCount = detalles.filter(d => d.resultado_foda === 'Oportunidad').length;
  const debilidadesCount = detalles.filter(d => d.resultado_foda === 'Debilidad').length;
  const amenazasCount = detalles.filter(d => d.resultado_foda === 'Amenaza').length;

  // 3. Determinar el color y el ícono de la tarjeta según la Clase del Dictamen
  const dictamenTexto = evaluacion.dictamen_final || 'Dictamen en proceso...';
  const esClaseA = dictamenTexto.includes('A-CLASS');
  const esClaseB = dictamenTexto.includes('B-CLASS');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Encabezado Ejecutivo */}
      <div className="glass p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Auditoría Calculada (Motor Transaccional)
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">
            Informe Ejecutivo: {evaluacion.software?.nombre || 'Software FLOSS'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Análisis consolidado multidimensional TOE e inferencia algorítmica sin división entera.
          </p>
        </div>
        <button 
          onClick={() => alert("Módulo de exportación PDF en construcción para el Sprint 1")}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 shrink-0"
        >
          <Download size={16} /> Exportar Dictamen PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (8 Columnas): Gráfico de Radar y Matriz FODA */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fila superior: Resumen Numérico FODA Real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="glass p-4 rounded-2xl border-l-4 border-l-emerald-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fortalezas</span>
              <span className="text-2xl font-black text-white mt-1 block">{fortalezasCount}</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Oportunidades</span>
              <span className="text-2xl font-black text-white mt-1 block">{oportunidadesCount}</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Debilidades</span>
              <span className="text-2xl font-black text-white mt-1 block">{debilidadesCount}</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-red-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Amenazas</span>
              <span className="text-2xl font-black text-white mt-1 block">{amenazasCount}</span>
            </div>
          </div>

          {/* Gráfico de Radar TOE y Explicación */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 glass p-6 rounded-2xl border border-gray-800 items-center">
            <div className="md:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-blue-500" /> Cobertura TOE Real
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Promedios exactos de cumplimiento evaluados en la base de datos relacional PostgreSQL.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-gray-800/80 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>Tecnológica:</span> <strong className="text-blue-400 font-mono">{evaluacion.promedio_T}%</strong>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Organizacional:</span> <strong className="text-amber-400 font-mono">{evaluacion.promedio_O}%</strong>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Económica:</span> <strong className="text-emerald-400 font-mono">{evaluacion.promedio_E}%</strong>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-7 h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="dimension" stroke="#888" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#333" tick={false} />
                  <Radar name="Adopción" dataKey="cumplimiento" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Matriz FODA Real */}
          <div className="glass rounded-2xl overflow-hidden border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#0a0a0a]">
              <h3 className="text-sm font-bold text-white">Desglose Oficial de Factores (Matriz FODA)</h3>
            </div>
            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-900/50 text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                    <th className="px-6 py-3.5">Factor</th>
                    <th className="px-4 py-3.5 text-center">Dimensión</th>
                    <th className="px-4 py-3.5 text-center">Imp. Relativa</th>
                    <th className="px-4 py-3.5 text-center">Alcance</th>
                    <th className="px-6 py-3.5 text-right">Clasificación FODA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {detalles.map((item, idx) => {
                    let badgeStyle = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                    if (item.resultado_foda === 'Fortaleza') badgeStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    if (item.resultado_foda === 'Debilidad') badgeStyle = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                    if (item.resultado_foda === 'Amenaza') badgeStyle = 'text-red-400 bg-red-500/10 border-red-500/30';

                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-gray-200">{item.factor_nombre}</td>
                        <td className="px-4 py-3.5 text-center text-gray-400">{item.dimension_nombre}</td>
                        <td className="px-4 py-3.5 text-center font-mono font-medium text-blue-400">{item.importancia_relativa}</td>
                        <td className="px-4 py-3.5 text-center text-gray-400">{item.alcance}</td>
                        <td className="px-6 py-3.5 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                            {item.resultado_foda || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (4 Columnas): Tarjeta del Dictamen e Inferencia */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className={`glass glow-blue rounded-3xl p-6 border relative overflow-hidden space-y-6 ${
            esClaseA ? 'border-red-500/40' : esClaseB ? 'border-amber-500/40' : 'border-blue-500/30'
          }`}>
            <div className="text-center space-y-1 border-b border-gray-800/80 pb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">
                Dictamen Algorítmico Oficial
              </span>
              <div className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2 pt-2">
                {esClaseA ? 'CLASE A (Rechazar)' : esClaseB ? 'CLASE B (Condicionada)' : 'CLASE C (Viable)'}
                <Award className={esClaseA ? 'text-red-400' : esClaseB ? 'text-amber-400' : 'text-blue-400'} size={24} />
              </div>
            </div>

            {/* Caja de Explicación del Dictamen */}
            <div className={`p-4 rounded-2xl border space-y-2 text-xs leading-relaxed ${
              esClaseA ? 'bg-red-500/10 border-red-500/20 text-red-200' :
              esClaseB ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
              'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
            }`}>
              <p className="font-semibold">{dictamenTexto}</p>
            </div>

            {/* Trazabilidad y Metadatos de la Auditoría */}
            <div className="bg-[#0a0a0a] border border-gray-800/80 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-800 pb-2">
                Trazabilidad de la Auditoría (RF-06)
              </span>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><User size={13} /> Evaluador:</span>
                  <span className="font-medium text-gray-200">Usuario Activo</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} /> Inicio:</span>
                  <span className="font-mono text-gray-400">
                    {new Date(evaluacion.fecha_inicio).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><Clock size={13} /> Modificación:</span>
                  <span className="font-mono text-blue-400">
                    {new Date(evaluacion.fecha_ultima_modificacion).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><FileCheck size={13} /> Estado:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{evaluacion.estado}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Report;
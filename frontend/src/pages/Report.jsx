import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, ShieldAlert, RefreshCw, Layers, User, Calendar } from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { toeService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Report() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Referencia al área del DOM que se convertirá en PDF
  const reportRef = useRef();

  const cargarDictamen = async () => {
    const evalId = localStorage.getItem('activeEvalId');
    if (!evalId) {
      setError('No hay ninguna evaluación seleccionada en memoria.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await toeService.calcularDictamen(evalId);
      setData(res);
    } catch (err) {
      console.error('Error al calcular dictamen:', err);
      setError('Error al conectar con el motor de inferencia en Django.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDictamen();
  }, []);

  // Hook para gestionar la generación y descarga del PDF
  const handleExportPDF = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `Dictamen_FLOSS_${data?.software?.nombre || 'Auditoria'}_${new Date().toISOString().slice(0, 10)}`,
  });

  if (loading) {
    return (
      <div className="glass p-16 rounded-3xl border border-gray-800 text-center space-y-4 max-w-xl mx-auto my-12 animate-fade-in">
        <RefreshCw className="animate-spin text-blue-500 mx-auto" size={36} />
        <h3 className="text-lg font-bold text-white">Procesando Inferencia Algorítmica...</h3>
        <p className="text-xs text-gray-400">
          Calculando promedios dimensionales TOE y clasificando matriz FODA sin división entera.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass p-12 rounded-3xl border border-red-500/20 text-center space-y-4 max-w-xl mx-auto my-12 animate-fade-in">
        <ShieldAlert className="text-red-400 mx-auto" size={40} />
        <h3 className="text-base font-bold text-white">{error || 'No se obtuvieron datos.'}</h3>
        <button
          onClick={cargarDictamen}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          Reintentar Cálculo
        </button>
      </div>
    );
  }

  // Extraemos variables del resultado de Django
  const desglose = data.desglose_foda || { fortalezas: [], oportunidades: [], debilidades: [], amenazas: [] };
  const numF = desglose.fortalezas.length;
  const numO = desglose.oportunidades.length;
  const numD = desglose.debilidades.length;
  const numA = desglose.amenazas.length;

  const promedios = data.promedios_dimensiones || { Tecnologica: 0, Organizacional: 0, Economica: 0 };
  const clase = data.clase_dictamen || 'CLASE C';

  const radarData = [
    { dimension: 'Tecnológica', valor: promedios.Tecnologica || 0, fullMark: 100 },
    { dimension: 'Organizacional', valor: promedios.Organizacional || 0, fullMark: 100 },
    { dimension: 'Económica', valor: promedios.Economica || 0, fullMark: 100 },
  ];

  const indiceGlobal = ((promedios.Tecnologica + promedios.Organizacional + promedios.Economica) / 3 || 0).toFixed(0);

  // Configuración visual según la clase del dictamen
  const dictamenConfig = {
    'CLASE A': {
      titulo: 'CLASE A (Rechazar)',
      desc: 'No es posible adoptar. Se han detectado amenazas y/o debilidades en factores cuya importancia relativa es fundamental o importante. Es indispensable proporcionar recursos para mitigar las brechas críticas.',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      badge: 'Rechazo Técnico'
    },
    'CLASE B': {
      titulo: 'CLASE B (Evaluar / Condicionado)',
      desc: 'Adopción viable con reservas. Existen brechas moderadas que requieren un plan de mitigación formal antes del pase a producción.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      badge: 'Adopción Condicionada'
    },
    'CLASE C': {
      titulo: 'CLASE C (Adoptar)',
      desc: 'Adopción recomendada. El software cumple satisfactoriamente con los umbrales tecnológicos, organizacionales y económicos evaluados.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      badge: 'Viable / Recomendado'
    }
  }[clase] || {
    titulo: clase,
    desc: 'Dictamen algorítmico calculado exitosamente.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'Calculado'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Estilos para forzar la impresión de colores de fondo oscuros en el PDF */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #050505 !important;
          }
          .glass {
            background: #0a0a0a !important;
            border-color: #1f2937 !important;
          }
        }
      `}</style>

      {/* BANNER SUPERIOR CON BOTÓN DE EXPORTACIÓN */}
      <div className="glass p-6 sm:p-8 rounded-3xl border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Auditoría Calculada (Motor Transaccional)
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
            Informe Ejecutivo: {data.software?.nombre || 'Software FLOSS'}
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Análisis consolidado multidimensional TOE e inferencia algorítmica sin división entera.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0 print:hidden"
        >
          <Download size={18} /> EXPORTAR DICTAMEN PDF
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL IMPRIMIBLE */}
      <div ref={reportRef} className="space-y-6 p-2">
        {/* KPI CARDS (CONTEO FODA) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fortalezas</span>
            <p className="text-3xl font-black text-emerald-400">{numF}</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-blue-500/30 bg-blue-950/10 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Oportunidades</span>
            <p className="text-3xl font-black text-blue-400">{numO}</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Debilidades</span>
            <p className="text-3xl font-black text-amber-400">{numD}</p>
          </div>
          <div className="glass p-5 rounded-2xl border border-red-500/30 bg-red-950/10 space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amenazas</span>
            <p className="text-3xl font-black text-red-400">{numA}</p>
          </div>
        </div>

        {/* GRÁFICO DE RADAR / COBERTURA Y DICTAMEN OFICIAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda (7 Col): Cobertura TOE Real */}
          <div className="lg:col-span-7 glass p-6 sm:p-8 rounded-3xl border border-gray-800 flex flex-col justify-between space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-blue-400" /> Cobertura TOE Real
              </h3>
              <p className="text-xs text-gray-400">
                Promedios exactos de cumplimiento evaluados en la base de datos relacional PostgreSQL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-300 font-sans">Tecnológica:</span>
                  <span className="font-bold text-blue-400">{(promedios.Tecnologica || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-300 font-sans">Organizacional:</span>
                  <span className="font-bold text-amber-400">{(promedios.Organizacional || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <span className="text-gray-300 font-sans">Económica:</span>
                  <span className="font-bold text-emerald-400">{(promedios.Economica || 0).toFixed(2)}%</span>
                </div>
              </div>

              {/* Gráfico Radar TOE dinámico */}
              <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded-2xl border border-gray-800/80">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: '#6b7280', fontSize: 9 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Cumplimiento TOE"
                      dataKey="valor"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Cumplimiento']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest -mt-1">
                  Índice Global: {indiceGlobal}%
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha (5 Col): Dictamen Algorítmico */}
          <div className="lg:col-span-5 glass p-6 sm:p-8 rounded-3xl border border-gray-800 flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dictamen Algorítmico Oficial</span>
              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${dictamenConfig.color}`}>
                {clase}
              </h1>
            </div>

            <div className={`p-5 rounded-2xl border ${dictamenConfig.bg} text-xs sm:text-sm leading-relaxed text-gray-200`}>
              <p className="font-semibold mb-1 text-white">{dictamenConfig.badge}:</p>
              {dictamenConfig.desc}
            </div>

            <div className="border-t border-gray-800/80 pt-4 space-y-2 text-xs text-gray-400">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><User size={13} /> Evaluador:</span>
                <span className="text-white font-medium">{user?.username || 'Usuario'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Calendar size={13} /> Modificación:</span>
                <span className="text-white font-medium">
                  {data.fecha_ultima_modificacion
                    ? new Date(data.fecha_ultima_modificacion).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA: DESGLOSE OFICIAL DE FACTORES (MATRIZ FODA) */}
        <div className="glass p-6 sm:p-8 rounded-3xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white tracking-wide">
            Desglose Oficial de Factores (Matriz FODA)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Factor / Subfactor</th>
                  <th className="py-3 px-4">Dimensión TOE</th>
                  <th className="py-3 px-4 text-center">Importancia</th>
                  <th className="py-3 px-4 text-center">Alcance</th>
                  <th className="py-3 px-4 text-right">Clasificación FODA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {/* Combinamos todas las listas FODA para renderizarlas en la tabla */}
                {[
                  ...desglose.fortalezas.map(f => ({ ...f, tipo: 'FORTALEZA', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' })),
                  ...desglose.oportunidades.map(o => ({ ...o, tipo: 'OPORTUNIDAD', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' })),
                  ...desglose.debilidades.map(d => ({ ...d, tipo: 'DEBILIDAD', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' })),
                  ...desglose.amenazas.map(a => ({ ...a, tipo: 'AMENAZA', color: 'text-red-400 bg-red-500/10 border-red-500/20' }))
                ].map((item, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-white font-semibold">{item.nombre || item.factor || `Factor #${index + 1}`}</td>
                    <td className="py-3.5 px-4 text-gray-400">{item.dimension || 'Tecnológica'}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-gray-300">{(item.importancia || 2.0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center text-gray-400 capitalize">{item.alcance || 'Interno'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase inline-block ${item.color}`}>
                        {item.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
import React from 'react';
import { 
  Download, ShieldCheck, AlertTriangle, XCircle, Award, 
  Calendar, User, Clock, FileCheck, Layers, ArrowUpRight 
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

// Datos estáticos simulados para la cobertura TOE en el Gráfico de Radar
const TOE_RADAR_DATA = [
  { dimension: 'Tecnológica', cumplimiento: 88, fullMark: 100 },
  { dimension: 'Organizacional', cumplimiento: 72, fullMark: 100 },
  { dimension: 'Económica', cumplimiento: 94, fullMark: 100 },
];

// Datos procesados de la Matriz FODA
const FODA_ITEMS = [
  { factor: 'Compatibilidad', dim: 'Tecnológica', ponderacion: '3.50', alcance: 'Externo', foda: 'Oportunidad', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { factor: 'Coste total de propiedad', dim: 'Económica', ponderacion: '3.80', alcance: 'Interno', foda: 'Fortaleza', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { factor: 'Formación del Personal', dim: 'Organizacional', ponderacion: '1.50', alcance: 'Interno', foda: 'Debilidad', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { factor: 'Bloqueo de Proveedores', dim: 'Tecnológica', ponderacion: '2.10', alcance: 'Externo', foda: 'Amenaza', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
];

function Report() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Encabezado Ejecutivo */}
      <div className="glass p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Auditoría Finalizada
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">Informe Ejecutivo de Adopción FLOSS</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Análisis consolidado del modelo TOE e inferencia algorítmica basada en la matriz de decisión GUIOSAD.
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 shrink-0">
          <Download size={16} /> Exportar Dictamen PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA (8 Columnas): Gráfico de Radar y Matriz FODA */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fila superior: Resumen Numérico FODA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="glass p-4 rounded-2xl border-l-4 border-l-emerald-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fortalezas</span>
              <span className="text-2xl font-black text-white mt-1 block">08</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Oportunidades</span>
              <span className="text-2xl font-black text-white mt-1 block">05</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Debilidades</span>
              <span className="text-2xl font-black text-white mt-1 block">03</span>
            </div>
            <div className="glass p-4 rounded-2xl border-l-4 border-l-red-500 border-y border-r border-gray-800/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Amenazas</span>
              <span className="text-2xl font-black text-white mt-1 block">02</span>
            </div>
          </div>

          {/* Gráfico de Radar TOE y Explicación */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 glass p-6 rounded-2xl border border-gray-800 items-center">
            <div className="md:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-blue-500" /> Cobertura TOE
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                El gráfico radial muestra el índice de madurez y compatibilidad evaluado para cada una de las tres dimensiones fundamentales del software.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-gray-800/80 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>Tecnológica:</span> <strong className="text-blue-400 font-mono">88%</strong>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Económica:</span> <strong className="text-emerald-400 font-mono">94%</strong>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Organizacional:</span> <strong className="text-amber-400 font-mono">72%</strong>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-7 h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={TOE_RADAR_DATA}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="dimension" stroke="#888" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#333" tick={false} />
                  <Radar name="Adopción" dataKey="cumplimiento" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Matriz FODA */}
          <div className="glass rounded-2xl overflow-hidden border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#0a0a0a]">
              <h3 className="text-sm font-bold text-white">Desglose de Factores Evaludados (Matriz FODA)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr class="bg-neutral-900/50 text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                    <th className="px-6 py-3.5">Factor</th>
                    <th className="px-4 py-3.5 text-center">Dimensión</th>
                    <th className="px-4 py-3.5 text-center">Ponderación</th>
                    <th className="px-4 py-3.5 text-center">Alcance</th>
                    <th className="px-6 py-3.5 text-right">Clasificación FODA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {FODA_ITEMS.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-200">{item.factor}</td>
                      <td className="px-4 py-4 text-center text-gray-400">{item.dim}</td>
                      <td className="px-4 py-4 text-center font-mono font-medium text-blue-400">{item.ponderacion}</td>
                      <td className="px-4 py-4 text-center text-gray-400">{item.alcance}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${item.color}`}>
                          {item.foda}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (4 Columnas): Tarjeta del Dictamen e Inferencia */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="glass glow-blue rounded-3xl p-6 border border-blue-500/30 relative overflow-hidden space-y-6">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="text-center space-y-1 border-b border-gray-800/80 pb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-400">
                Dictamen Algorítmico
              </span>
              <div className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2 pt-1">
                A-CLASS <Award className="text-blue-400" size={28} />
              </div>
              <p className="text-[11px] text-gray-400 pt-1">Clasificación Óptima de Adopción</p>
            </div>

            {/* Caja de Recomendación */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} /> Recomendación: Viable Adoptar
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                La organización cumple satisfactoriamente con los requisitos críticos. Las oportunidades y fortalezas superan a las debilidades en los factores fundamentales.
              </p>
            </div>

            {/* Trazabilidad y Metadatos de la Auditoría */}
            <div className="bg-[#0a0a0a] border border-gray-800/80 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-800 pb-2">
                Trazabilidad de la Auditoría
              </span>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><User size={13} /> Evaluador:</span>
                  <span className="font-medium text-gray-200">Ing. Victor Rea</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} /> Fecha Inicio:</span>
                  <span className="font-mono text-gray-400">14/Oct/2026</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><Clock size={13} /> Modificación:</span>
                  <span className="font-mono text-blue-400">15/Oct/2026 14:30</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-500 flex items-center gap-1.5"><FileCheck size={13} /> Emisión:</span>
                  <span className="font-mono text-emerald-400 font-semibold">Automática (Engine)</span>
                </div>
              </div>
            </div>

            <button className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-md">
              <Download size={15} /> Descargar Reporte PDF
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Report;
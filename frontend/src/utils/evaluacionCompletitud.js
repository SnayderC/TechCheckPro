import { toeService, wizardCache } from '../services/api';
import { calcularImportanciaRelativa, esFactorRelevante, normalizarNivel } from './guiosadCalculos';

/**
 * Calcula completitud de subfactores relevantes (RF-14).
 * Usa datos del servidor; el caché local complementa respondidos aún no guardados.
 */
export function calcularCompletitud(catalogo, detalle, evalId = null) {
  const respondidos = { ...(detalle.respondidos || {}) };
  const decisiones = detalle.decisiones || {};

  if (evalId) {
    const cache = wizardCache.load(evalId);
    if (cache?.respondidos) {
      Object.assign(respondidos, cache.respondidos);
    }
    if (cache?.decisiones) {
      Object.assign(decisiones, cache.decisiones);
    }
  }

  const subfactoresRelevantes = [];
  catalogo.forEach((f) => {
    const isVal = normalizarNivel(f.importancia_sugerida);
    const idRaw = decisiones[String(f.id)] ?? f.importancia_sugerida;
    const idVal = normalizarNivel(idRaw);
    const ir = calcularImportanciaRelativa(isVal, idVal);
    if (!esFactorRelevante(ir.valor)) return;

    (f.subfactores || []).forEach((sf) => {
      subfactoresRelevantes.push({
        id: sf.id,
        dimension: f.dimension_nombre,
      });
    });
  });

  const completados = subfactoresRelevantes.filter(
    (sf) => respondidos[String(sf.id)] || respondidos[sf.id],
  ).length;
  const total = subfactoresRelevantes.length;
  const completa = total > 0 && completados === total;

  const pendientesPorDimension = {};
  subfactoresRelevantes.forEach((sf) => {
    if (respondidos[String(sf.id)] || respondidos[sf.id]) return;
    pendientesPorDimension[sf.dimension] = (pendientesPorDimension[sf.dimension] || 0) + 1;
  });

  const faltan = total - completados;
  let mensaje = '';
  if (!completa && total > 0) {
    const detalleDims = Object.entries(pendientesPorDimension)
      .map(([dim, cant]) => `${cant} en ${dim}`)
      .join(', ');
    mensaje = `Complete la Matriz TOE antes de ver el dictamen. Faltan ${faltan} subfactores por calificar${detalleDims ? `: ${detalleDims}` : ''}.`;
  }

  return {
    completa,
    completados,
    total,
    faltan,
    mensaje,
    pendientesPorDimension,
  };
}

export async function verificarCompletitudEvaluacion(evalId) {
  const [catalogo, detalle] = await Promise.all([
    toeService.getCatalogo(),
    toeService.getEvaluacionDetalle(evalId),
  ]);

  const yaCalculada = detalle.estado === 'Calculado' || detalle.estado === 'Bloqueado';
  const stats = calcularCompletitud(catalogo, detalle, evalId);

  return {
    ...stats,
    estado: detalle.estado,
    puedeVerDictamen: yaCalculada || stats.completa,
    mensajeBloqueo: yaCalculada ? '' : stats.mensaje,
  };
}

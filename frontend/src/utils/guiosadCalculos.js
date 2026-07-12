/** Utilidades de cálculo de importancia relativa (escala 1-4). */

export const NIVELES_IMPORTANCIA = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental'];

export const DECISION_LEVELS = [
  { val: 1, label: 'Irrelevante' },
  { val: 2, label: 'Opcional' },
  { val: 3, label: 'Importante' },
  { val: 4, label: 'Fundamental' },
];

export function normalizarNivel(valor) {
  const n = Math.round(Number(valor));
  return Math.max(1, Math.min(4, n));
}

export function calcularImportanciaRelativa(isValor, idValor) {
  const isN = normalizarNivel(isValor);
  const idN = normalizarNivel(idValor);
  const r = Math.floor((isN - 1 + idN - 1) / 2);
  return {
    valor: r + 1,
    etiqueta: NIVELES_IMPORTANCIA[r],
  };
}

export function esFactorRelevante(irValor) {
  return normalizarNivel(irValor) >= 2;
}

export function etiquetaImportancia(valor) {
  return NIVELES_IMPORTANCIA[normalizarNivel(valor) - 1];
}

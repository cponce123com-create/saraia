/**
 * Algoritmo de matching entre gasto de YAPE y datos extraídos de factura.
 * 
 * Reglas:
 * - Fecha: mismo día ±2 días
 * - Monto: diferencia < 5 soles
 * 
 * @param {Object} gasto - { fecha, monto, descripcion }
 * @param {Object} ocrData - { fecha, monto, proveedor }
 * @param {Object} opciones - { toleranciaDias, toleranciaMonto }
 * @returns {number} Score de matching (0-1), 1 = match perfecto
 */
export function calcularMatch(gasto, ocrData, opciones = {}) {
  const { toleranciaDias = 2, toleranciaMonto = 5 } = opciones;

  if (!gasto || !ocrData) return 0;
  if (!ocrData.fecha && !ocrData.monto) return 0;

  let score = 0;
  let totalPonderado = 0;

  // Comparar fecha (peso: 50%)
  if (gasto.fecha && ocrData.fecha) {
    totalPonderado += 0.5;
    const diffDias = Math.abs(
      new Date(gasto.fecha) - new Date(ocrData.fecha)
    ) / (1000 * 60 * 60 * 24);

    if (diffDias <= toleranciaDias) {
      score += 0.5 * (1 - diffDias / (toleranciaDias + 1));
    }
  }

  // Comparar monto (peso: 50%)
  if (gasto.monto && ocrData.monto) {
    totalPonderado += 0.5;
    const diffMonto = Math.abs(gasto.monto - ocrData.monto);
    
    if (diffMonto <= toleranciaMonto) {
      score += 0.5 * (1 - diffMonto / (toleranciaMonto + 1));
    }
  }

  // Si no hay suficientes datos para comparar, score bajo
  if (totalPonderado === 0) return 0;

  return score / totalPonderado;
}

/**
 * Encuentra el mejor match para un OCR entre múltiples gastos.
 * 
 * @param {Array} gastos - Lista de gastos pendientes
 * @param {Object} ocrData - Datos extraídos de factura
 * @param {Object} opciones - Opciones de tolerancia
 * @returns {Object} { match: 'unico' | 'multiple' | 'ninguno', gastos: Array, scores: Array }
 */
export function encontrarMatch(gastos, ocrData, opciones = {}) {
  const { umbralUnico = 0.6, umbralMinimo = 0.3 } = opciones;

  const resultados = gastos
    .filter((g) => g.estado !== 'sin_factura' && g.estado !== 'verificado')
    .map((gasto) => ({
      gasto,
      score: calcularMatch(gasto, ocrData, opciones),
    }))
    .filter((r) => r.score >= umbralMinimo)
    .sort((a, b) => b.score - a.score);

  if (resultados.length === 0) {
    return { match: 'ninguno', gastos: [], scores: [] };
  }

  if (resultados.length === 1 && resultados[0].score >= umbralUnico) {
    return { match: 'unico', gastos: [resultados[0].gasto], scores: resultados };
  }

  // Si el mejor es muy superior al segundo, también es único
  if (resultados.length >= 2) {
    const mejor = resultados[0].score;
    const segundo = resultados[1].score;
    if (mejor - segundo > 0.3 && mejor >= umbralUnico) {
      return { match: 'unico', gastos: [resultados[0].gasto], scores: [resultados[0]] };
    }
  }

  return { match: 'multiple', gastos: resultados.map((r) => r.gasto), scores: resultados };
}

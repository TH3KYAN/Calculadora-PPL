import { format, number as mathNumber } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { SimplexTableau, Solution } from '../types.js';

/**
 * Formatea un valor fraccionario para mostrar en la tabla.
 * Enteros se muestran sin denominador (e.g., "3" en vez de "3/1").
 */
function formatFraction(val: unknown): string {
  const num = mathNumber(val as Fraction) as number;
  if (Number.isInteger(num)) {
    return num.toString();
  }
  return format(val, { fraction: 'ratio' });
}

/**
 * Imprime una tabla Simplex con formato bonito.
 */
export function printTableau(tableau: SimplexTableau, iteration: number, label?: string): void {
  const title = label ? `${label} — Iteracion ${iteration}` : `Iteracion ${iteration}`;
  console.log(`\n┌─── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}┐`);

  const matrix = tableau.matrix;
  const headers = tableau.headers;

  // Calcular ancho de cada columna
  const colWidths: number[] = headers.map(h => h.length);
  const basisLabel = 'Base';
  let basisWidth = basisLabel.length;

  // Considerar el ancho de los valores
  for (let i = 0; i < matrix.length; i++) {
    const bName = i === 0 ? 'Z' : (headers[tableau.basisVariables[i - 1]!] ?? `?`);
    if (bName.length > basisWidth) basisWidth = bName.length;
    for (let j = 0; j < matrix[i]!.length; j++) {
      const valStr = formatFraction(matrix[i]![j]);
      if (valStr.length > (colWidths[j] ?? 0)) {
        colWidths[j] = valStr.length;
      }
    }
  }

  // Imprimir encabezado
  let headerLine = `  ${basisLabel.padStart(basisWidth)} │`;
  for (let j = 0; j < headers.length; j++) {
    headerLine += ` ${headers[j]!.padStart(colWidths[j]!)} │`;
  }
  console.log(headerLine);

  // Separador
  let sep = `  ${'─'.repeat(basisWidth)}─┼`;
  for (let j = 0; j < headers.length; j++) {
    sep += `${'─'.repeat(colWidths[j]! + 2)}┼`;
  }
  console.log(sep);

  // Filas
  for (let i = 0; i < matrix.length; i++) {
    const bName = i === 0 ? 'Z' : (headers[tableau.basisVariables[i - 1]!] ?? `?`);
    let line = `  ${bName.padStart(basisWidth)} │`;
    for (let j = 0; j < matrix[i]!.length; j++) {
      line += ` ${formatFraction(matrix[i]![j]).padStart(colWidths[j]!)} │`;
    }
    console.log(line);
  }

  console.log(`└${'─'.repeat(70)}┘`);
}

/**
 * Imprime la solucion final.
 */
export function printSolution(solution: Solution, method: string, numOriginalVars: number): void {
  console.log(`\n╔${'═'.repeat(50)}╗`);
  console.log(`║  RESULTADO — ${method.padEnd(35)}║`);
  console.log(`╠${'═'.repeat(50)}╣`);

  if (solution.status === 'optimal') {
    console.log(`║  Estado: ✅ SOLUCION OPTIMA ENCONTRADA${' '.repeat(11)}║`);
    console.log(`║  Valor optimo Z = ${formatFraction(solution.objectiveValue).padEnd(30)}║`);
    if (solution.variables) {
      for (let i = 0; i < numOriginalVars; i++) {
        const val = solution.variables[i];
        console.log(`║  x${i + 1} = ${formatFraction(val).padEnd(41)}║`);
      }
    }
  } else if (solution.status === 'unbounded') {
    console.log(`║  Estado: ⚠️  PROBLEMA NO ACOTADO${' '.repeat(16)}║`);
    console.log(`║  La funcion objetivo puede crecer${' '.repeat(16)}║`);
    console.log(`║  indefinidamente.${' '.repeat(32)}║`);
  } else {
    console.log(`║  Estado: ❌ PROBLEMA INFACTIBLE${' '.repeat(18)}║`);
    console.log(`║  No existe solucion factible.${' '.repeat(20)}║`);
  }

  console.log(`╚${'═'.repeat(50)}╝`);
  console.log(`  Total de iteraciones: ${solution.iterations.length}`);
}

/**
 * Imprime un paso/mensaje con estilo.
 */
export function printStep(message: string): void {
  console.log(`\n  ► ${message}`);
}

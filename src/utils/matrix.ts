import { fraction, multiply, divide, subtract, number as mathNumber } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { SimplexTableau } from '../types.js';

/** Helper: returns true if a < b (as fractions). */
function lt(a: Fraction, b: Fraction): boolean {
  return mathNumber(subtract(a, b) as Fraction) < 0;
}

/** Helper: returns true if a > b (as fractions). */
function gt(a: Fraction, b: Fraction): boolean {
  return mathNumber(subtract(a, b) as Fraction) > 0;
}

/** Helper: returns true if a === b (as fractions). */
function eq(a: Fraction, b: Fraction): boolean {
  return mathNumber(subtract(a, b) as Fraction) === 0;
}

const ZERO = fraction(0);

/**
 * Realiza la operacion de pivoteo de Gauss-Jordan sobre la tabla.
 * Modifica la tabla in-place.
 */
export function pivotOperation(tableau: SimplexTableau, pivotRow: number, pivotCol: number): void {
  const matrix = tableau.matrix;
  const numRows = matrix.length;
  const pivotElement = matrix[pivotRow]![pivotCol]!;

  // Dividir la fila pivote entre el elemento pivote
  for (let j = 0; j < matrix[pivotRow]!.length; j++) {
    matrix[pivotRow]![j] = divide(matrix[pivotRow]![j]!, pivotElement) as Fraction;
  }

  // Hacer ceros en la columna pivote para las demas filas
  for (let i = 0; i < numRows; i++) {
    if (i === pivotRow) continue;
    const factor = matrix[i]![pivotCol]!;
    for (let j = 0; j < matrix[i]!.length; j++) {
      matrix[i]![j] = subtract(
        matrix[i]![j]!,
        multiply(factor, matrix[pivotRow]![j]!) as Fraction
      ) as Fraction;
    }
  }

  // Actualizar la variable basica de la fila pivote
  tableau.basisVariables[pivotRow - 1] = pivotCol;
}

/**
 * Encuentra la columna pivote para el metodo Simplex (el coeficiente mas negativo en la fila Z).
 * Retorna -1 si no hay negativos (solucion optima).
 */
export function findPivotColumn(tableau: SimplexTableau): number {
  const zRow = tableau.matrix[0]!;
  let minVal = ZERO;
  let minCol = -1;

  // Excluir la ultima columna (RHS)
  for (let j = 0; j < zRow.length - 1; j++) {
    if (lt(zRow[j]!, minVal)) {
      minVal = zRow[j]!;
      minCol = j;
    }
  }

  return minCol;
}

/**
 * Encuentra la fila pivote usando la prueba de razon minima.
 * Retorna -1 si el problema es no acotado.
 */
export function findPivotRow(tableau: SimplexTableau, pivotCol: number): number {
  const matrix = tableau.matrix;
  let minRatio: Fraction | null = null;
  let minRow = -1;
  const rhsCol = matrix[0]!.length - 1;

  // Empezar en fila 1 (fila 0 es Z)
  for (let i = 1; i < matrix.length; i++) {
    const element = matrix[i]![pivotCol]!;
    if (gt(element, ZERO)) {
      const ratio = divide(matrix[i]![rhsCol]!, element) as Fraction;
      if (minRatio === null || lt(ratio, minRatio)) {
        minRatio = ratio;
        minRow = i;
      }
    }
  }

  return minRow;
}

/**
 * Encuentra la fila pivote para Dual Simplex (RHS mas negativo).
 * Retorna -1 si todos los RHS son >= 0 (factible).
 */
export function findDualPivotRow(tableau: SimplexTableau): number {
  const matrix = tableau.matrix;
  const rhsCol = matrix[0]!.length - 1;
  let minVal = ZERO;
  let minRow = -1;

  for (let i = 1; i < matrix.length; i++) {
    if (lt(matrix[i]![rhsCol]!, minVal)) {
      minVal = matrix[i]![rhsCol]!;
      minRow = i;
    }
  }

  return minRow;
}

/**
 * Encuentra la columna pivote para Dual Simplex.
 * Retorna -1 si el problema es infactible.
 */
export function findDualPivotColumn(tableau: SimplexTableau, pivotRow: number): number {
  const matrix = tableau.matrix;
  const zRow = matrix[0]!;
  let minRatio: Fraction | null = null;
  let minCol = -1;

  for (let j = 0; j < zRow.length - 1; j++) {
    const element = matrix[pivotRow]![j]!;
    if (lt(element, ZERO)) {
      // Razon: |Z_j / a_{rj}|
      const ratio = divide(zRow[j]!, element) as Fraction;
      const ratioNum = Math.abs(mathNumber(ratio) as number);
      if (minRatio === null || ratioNum < Math.abs(mathNumber(minRatio) as number)) {
        minRatio = ratio;
        minCol = j;
      }
    }
  }

  return minCol;
}

/**
 * Clona una tabla Simplex para guardar en el historial.
 */
export function cloneTableau(tableau: SimplexTableau): SimplexTableau {
  return {
    matrix: tableau.matrix.map(row => row.map(val => fraction(mathNumber(val)))),
    basisVariables: [...tableau.basisVariables],
    headers: [...tableau.headers],
  };
}

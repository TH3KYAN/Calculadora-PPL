import { fraction, unaryMinus, number as mathNumber, subtract } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { LinearProblem, Solution, SimplexTableau } from './types.js';
import { pivotOperation, findDualPivotRow, findDualPivotColumn, cloneTableau } from './utils/matrix.js';
import { printTableau, printStep } from './utils/formatter.js';

/** Helper: returns true if a < b */
function lt(a: Fraction, b: Fraction): boolean {
  return (mathNumber(subtract(a, b) as Fraction) as number) < 0;
}

const ZERO = fraction(0);

/**
 * Resuelve un problema de programacion lineal usando el Metodo Simplex Dual.
 * Funciona bien cuando la solucion es dual-factible pero primal-infactible
 * (coeficientes de la fila Z no-negativos pero RHS negativos).
 */
export function solveDual(problem: LinearProblem): Solution {
  printStep('Iniciando Metodo Simplex Dual...');

  const { objectiveType, objectiveCoefficients, constraints, numVariables } = problem;
  const numConstraints = constraints.length;

  const totalVars = numVariables + numConstraints;

  // Construir encabezados
  const headers: string[] = [];
  for (let i = 0; i < numVariables; i++) {
    headers.push(`x${i + 1}`);
  }
  for (let i = 0; i < numConstraints; i++) {
    headers.push(`s${i + 1}`);
  }
  headers.push('RHS');

  // Construir fila Z
  const zRow: Fraction[] = [];
  for (let j = 0; j < numVariables; j++) {
    if (objectiveType === 'min') {
      // Para minimizar, colocamos los coeficientes positivos en la fila Z
      zRow.push(objectiveCoefficients[j]!);
    } else {
      zRow.push(unaryMinus(objectiveCoefficients[j]!) as Fraction);
    }
  }
  for (let i = 0; i < numConstraints; i++) {
    zRow.push(fraction(0));
  }
  zRow.push(fraction(0));

  // Construir filas de restricciones
  const matrix: Fraction[][] = [zRow];
  const basisVariables: number[] = [];

  for (let i = 0; i < numConstraints; i++) {
    const row: Fraction[] = [];
    const constraint = constraints[i]!;

    if (constraint.type === '>=') {
      // Multiplicar por -1: a*x >= b → -a*x + s = -b
      for (let j = 0; j < numVariables; j++) {
        row.push(unaryMinus(constraint.coefficients[j]!) as Fraction);
      }
      for (let k = 0; k < numConstraints; k++) {
        row.push(k === i ? fraction(1) : fraction(0));
      }
      row.push(unaryMinus(constraint.rhs) as Fraction);
    } else if (constraint.type === '<=') {
      for (let j = 0; j < numVariables; j++) {
        row.push(constraint.coefficients[j]!);
      }
      for (let k = 0; k < numConstraints; k++) {
        row.push(k === i ? fraction(1) : fraction(0));
      }
      row.push(constraint.rhs);
    } else {
      // Para '=', multiplicamos por -1 si RHS es positivo (para tener RHS negativo → dual)
      const needFlip = !lt(constraint.rhs, ZERO);
      for (let j = 0; j < numVariables; j++) {
        row.push(needFlip
          ? unaryMinus(constraint.coefficients[j]!) as Fraction
          : constraint.coefficients[j]!);
      }
      for (let k = 0; k < numConstraints; k++) {
        row.push(k === i ? (needFlip ? fraction(-1) : fraction(1)) : fraction(0));
      }
      row.push(needFlip ? unaryMinus(constraint.rhs) as Fraction : constraint.rhs);
    }

    matrix.push(row);
    basisVariables.push(numVariables + i);
  }

  const tableau: SimplexTableau = { matrix, basisVariables, headers };
  const iterations: SimplexTableau[] = [cloneTableau(tableau)];

  printStep('Tabla Dual inicial construida');
  printTableau(tableau, 0);

  // Verificar factibilidad dual (todos los coeficientes en fila Z >= 0)
  let dualFeasible = true;
  for (let j = 0; j < totalVars; j++) {
    if (lt(matrix[0]![j]!, ZERO)) {
      dualFeasible = false;
      break;
    }
  }

  if (!dualFeasible) {
    printStep('Advertencia: La tabla no es dual-factible. El metodo podria no converger.');
  }

  // Iteraciones del Dual Simplex
  const MAX_ITERATIONS = 100;
  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    // Paso 1: Encontrar fila pivote (RHS mas negativo)
    const pivotRowIdx = findDualPivotRow(tableau);
    if (pivotRowIdx === -1) {
      // Todos los RHS >= 0 → solucion optima encontrada
      printStep('Todos los RHS son no-negativos. !Solucion optima encontrada!');
      return buildDualSolution(tableau, iterations, numVariables, objectiveType);
    }

    const pivotRowBasis = headers[basisVariables[pivotRowIdx - 1]!];
    printStep(`Fila pivote (RHS mas negativo): ${pivotRowBasis} (fila ${pivotRowIdx})`);

    // Paso 2: Encontrar columna pivote
    const pivotCol = findDualPivotColumn(tableau, pivotRowIdx);
    if (pivotCol === -1) {
      printStep('No se encontro columna pivote valida. !Problema infactible!');
      return { status: 'infeasible', iterations };
    }

    printStep(`Columna pivote: ${headers[pivotCol]} (columna ${pivotCol + 1})`);

    // Paso 3: Pivotear
    pivotOperation(tableau, pivotRowIdx, pivotCol);
    iterations.push(cloneTableau(tableau));

    printTableau(tableau, iter);
  }

  printStep('Se alcanzo el maximo de iteraciones.');
  return { status: 'infeasible', iterations };
}

/**
 * Extrae la solucion del Dual Simplex.
 */
function buildDualSolution(
  tableau: SimplexTableau,
  iterations: SimplexTableau[],
  numOriginalVars: number,
  objectiveType: string
): Solution {
  const matrix = tableau.matrix;
  const rhsCol = matrix[0]!.length - 1;

  let objectiveValue = matrix[0]![rhsCol]!;
  // Para minimizacion, el valor en la tabla es negativo del optimo
  if (objectiveType === 'min') {
    objectiveValue = unaryMinus(objectiveValue) as Fraction;
  }

  const variables: Fraction[] = [];
  for (let j = 0; j < numOriginalVars; j++) {
    const basisIdx = tableau.basisVariables.indexOf(j);
    if (basisIdx !== -1) {
      variables.push(matrix[basisIdx + 1]![rhsCol]!);
    } else {
      variables.push(fraction(0));
    }
  }

  return {
    status: 'optimal',
    objectiveValue,
    variables,
    iterations,
  };
}

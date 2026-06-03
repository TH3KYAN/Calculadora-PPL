import { fraction, multiply, unaryMinus, number as mathNumber, subtract } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { LinearProblem, Solution, SimplexTableau } from './types.js';
import { pivotOperation, findPivotColumn, findPivotRow, cloneTableau } from './utils/matrix.js';
import { printTableau, printStep } from './utils/formatter.js';

/** Helper: returns true if a < b */
function lt(a: Fraction, b: Fraction): boolean {
  return (mathNumber(subtract(a, b) as Fraction) as number) < 0;
}

const ZERO = fraction(0);

/**
 * Resuelve un problema de programacion lineal usando el Metodo Simplex.
 * Requiere que todas las restricciones sean del tipo <=.
 */
export function solveSimplex(problem: LinearProblem): Solution {
  printStep('Iniciando Metodo Simplex...');

  const { objectiveType, objectiveCoefficients, constraints, numVariables } = problem;
  const numConstraints = constraints.length;

  // Verificar que todas las restricciones son <=
  for (const c of constraints) {
    if (c.type !== '<=') {
      printStep('Error: El metodo Simplex estandar requiere restricciones <=');
      printStep('Use el metodo de Dos Fases para restricciones >= o =');
      return { status: 'infeasible', iterations: [] };
    }
    // Verificar que RHS >= 0
    if (lt(c.rhs, ZERO)) {
      printStep('Error: El lado derecho debe ser >= 0 para Simplex estandar');
      return { status: 'infeasible', iterations: [] };
    }
  }

  // Numero total de variables (originales + holgura)
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
    // Para maximizar, los coeficientes en la fila Z son negativos
    if (objectiveType === 'max') {
      zRow.push(unaryMinus(objectiveCoefficients[j]!) as Fraction);
    } else {
      zRow.push(objectiveCoefficients[j]!);
    }
  }
  // Variables de holgura tienen coeficiente 0 en Z
  for (let i = 0; i < numConstraints; i++) {
    zRow.push(fraction(0));
  }
  // RHS de Z = 0
  zRow.push(fraction(0));

  // Construir filas de restricciones
  const matrix: Fraction[][] = [zRow];
  const basisVariables: number[] = [];

  for (let i = 0; i < numConstraints; i++) {
    const row: Fraction[] = [];
    // Coeficientes originales
    for (let j = 0; j < numVariables; j++) {
      row.push(constraints[i]!.coefficients[j]!);
    }
    // Variables de holgura (identidad)
    for (let k = 0; k < numConstraints; k++) {
      row.push(k === i ? fraction(1) : fraction(0));
    }
    // RHS
    row.push(constraints[i]!.rhs);
    matrix.push(row);
    basisVariables.push(numVariables + i); // s_i es basica
  }

  const tableau: SimplexTableau = { matrix, basisVariables, headers };
  const iterations: SimplexTableau[] = [cloneTableau(tableau)];

  printStep('Tabla inicial construida');
  printTableau(tableau, 0);

  // Iteraciones del Simplex
  const MAX_ITERATIONS = 100;
  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    // Paso 1: Encontrar columna pivote
    const pivotCol = findPivotColumn(tableau);
    if (pivotCol === -1) {
      // No hay negativos en fila Z → solucion optima
      printStep('No hay coeficientes negativos en la fila Z. !Solucion optima encontrada!');
      return buildSolution(tableau, iterations, numVariables);
    }

    printStep(`Columna pivote: ${headers[pivotCol]} (columna ${pivotCol + 1})`);

    // Paso 2: Encontrar fila pivote
    const pivotRowIdx = findPivotRow(tableau, pivotCol);
    if (pivotRowIdx === -1) {
      printStep('No hay elementos positivos en la columna pivote. !Problema no acotado!');
      return { status: 'unbounded', iterations };
    }

    const pivotRowBasis = headers[basisVariables[pivotRowIdx - 1]!];
    printStep(`Fila pivote: ${pivotRowBasis} (fila ${pivotRowIdx})`);

    // Paso 3: Pivotear
    pivotOperation(tableau, pivotRowIdx, pivotCol);
    iterations.push(cloneTableau(tableau));

    printTableau(tableau, iter);
  }

  printStep('Se alcanzo el maximo de iteraciones.');
  return { status: 'infeasible', iterations };
}

/**
 * Extrae la solucion de la tabla final.
 */
function buildSolution(
  tableau: SimplexTableau,
  iterations: SimplexTableau[],
  numOriginalVars: number,
): Solution {
  const matrix = tableau.matrix;
  const rhsCol = matrix[0]!.length - 1;

  // Valor optimo
  const objectiveValue = matrix[0]![rhsCol]!;

  // Variables de decision
  const variables: Fraction[] = [];
  for (let j = 0; j < numOriginalVars; j++) {
    // Buscar si x_j es variable basica
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

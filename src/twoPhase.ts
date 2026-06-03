import { fraction, multiply, unaryMinus, add, number as mathNumber, subtract as mathSubtract } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { LinearProblem, Solution, SimplexTableau } from './types.js';
import { pivotOperation, findPivotColumn, findPivotRow, cloneTableau } from './utils/matrix.js';
import { printTableau, printStep } from './utils/formatter.js';

/** Helper: returns true if a < b */
function lt(a: Fraction, b: Fraction): boolean {
  return (mathNumber(mathSubtract(a, b) as Fraction) as number) < 0;
}

/** Helper: a != 0 */
function notZero(a: Fraction): boolean {
  return (mathNumber(a) as number) !== 0;
}

/** Subtract two fractions */
function sub(a: Fraction, b: Fraction): Fraction {
  return mathSubtract(a, b) as Fraction;
}

const ZERO = fraction(0);

/**
 * Resuelve un problema de programacion lineal usando el Metodo de Dos Fases.
 * Funciona con cualquier tipo de restriccion (<=, >=, =).
 */
export function solveTwoPhase(problem: LinearProblem): Solution {
  printStep('Iniciando Metodo de Dos Fases...');

  const { objectiveType, objectiveCoefficients, constraints, numVariables } = problem;
  const numConstraints = constraints.length;

  // Paso 1: Determinar variables de holgura, exceso y artificiales
  let slackCount = 0;
  let surplusCount = 0;
  let artificialCount = 0;

  interface VarInfo {
    slackIdx: number;
    surplusIdx: number;
    artificialIdx: number;
    hasSlack: boolean;
    hasSurplus: boolean;
    hasArtificial: boolean;
  }

  const constraintInfo: VarInfo[] = [];

  for (const c of constraints) {
    const info: VarInfo = {
      slackIdx: -1, surplusIdx: -1, artificialIdx: -1,
      hasSlack: false, hasSurplus: false, hasArtificial: false,
    };

    if (c.type === '<=') {
      info.hasSlack = true;
      info.slackIdx = slackCount++;
    } else if (c.type === '>=') {
      info.hasSurplus = true;
      info.surplusIdx = surplusCount++;
      info.hasArtificial = true;
      info.artificialIdx = artificialCount++;
    } else {
      // '='
      info.hasArtificial = true;
      info.artificialIdx = artificialCount++;
    }

    constraintInfo.push(info);
  }

  // Numero total de columnas: vars originales + holgura + exceso + artificiales + RHS
  const totalCols = numVariables + slackCount + surplusCount + artificialCount + 1;

  // Indices base para cada tipo de variable
  const slackBase = numVariables;
  const surplusBase = slackBase + slackCount;
  const artificialBase = surplusBase + surplusCount;

  // Construir encabezados
  const headers: string[] = [];
  for (let i = 0; i < numVariables; i++) headers.push(`x${i + 1}`);
  for (let i = 0; i < slackCount; i++) headers.push(`s${i + 1}`);
  for (let i = 0; i < surplusCount; i++) headers.push(`e${i + 1}`);
  for (let i = 0; i < artificialCount; i++) headers.push(`a${i + 1}`);
  headers.push('RHS');

  // ═══════════════════════════════════════════════════════
  // FASE 1: Minimizar w = suma de variables artificiales
  // ═══════════════════════════════════════════════════════
  printStep('══════ FASE 1: Minimizar W (suma de artificiales) ══════');

  // Fila W inicial: coeficiente 1 para cada variable artificial, 0 para el resto
  const wRow: Fraction[] = new Array(totalCols).fill(null).map(() => fraction(0));

  // Construir filas de restricciones
  const matrix: Fraction[][] = [wRow];
  const basisVariables: number[] = [];

  for (let i = 0; i < numConstraints; i++) {
    const row: Fraction[] = new Array(totalCols).fill(null).map(() => fraction(0));
    const c = constraints[i]!;
    const info = constraintInfo[i]!;

    // Asegurar RHS >= 0 (multiplicar por -1 si negativo)
    let sign = 1;
    if (lt(c.rhs, ZERO)) {
      sign = -1;
    }

    // Coeficientes originales
    for (let j = 0; j < numVariables; j++) {
      row[j] = sign === -1
        ? unaryMinus(c.coefficients[j]!) as Fraction
        : c.coefficients[j]!;
    }

    // Variable de holgura
    if (info.hasSlack) {
      row[slackBase + info.slackIdx] = fraction(sign);
    }

    // Variable de exceso
    if (info.hasSurplus) {
      row[surplusBase + info.surplusIdx] = fraction(-sign);
    }

    // Variable artificial
    if (info.hasArtificial) {
      row[artificialBase + info.artificialIdx] = fraction(1);
      basisVariables.push(artificialBase + info.artificialIdx);
    } else {
      // Holgura es basica
      basisVariables.push(slackBase + info.slackIdx);
    }

    // RHS
    row[totalCols - 1] = sign === -1
      ? unaryMinus(c.rhs) as Fraction
      : c.rhs;

    matrix.push(row);
  }

  // Ajustar fila W: para cada fila con variable artificial basica,
  // restar esa fila de la fila W para crear ceros en las columnas de las artificiales
  // W = sum(artificials) → W - row_i para cada fila i con artificial en la base
  for (let i = 0; i < numConstraints; i++) {
    if (constraintInfo[i]!.hasArtificial) {
      for (let j = 0; j < totalCols; j++) {
        wRow[j] = sub(wRow[j]!, matrix[i + 1]![j]!);
      }
    }
  }

  const tableau: SimplexTableau = { matrix, basisVariables, headers };
  const allIterations: SimplexTableau[] = [cloneTableau(tableau)];

  printTableau(tableau, 0, 'Fase 1');

  // Resolver Fase 1 con Simplex
  const MAX_ITERATIONS = 100;
  let iterCount = 0;

  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    const pivotCol = findPivotColumn(tableau);
    if (pivotCol === -1) break;

    const pivotRowIdx = findPivotRow(tableau, pivotCol);
    if (pivotRowIdx === -1) {
      printStep('Problema no acotado en Fase 1.');
      return { status: 'infeasible', iterations: allIterations };
    }

    printStep(`Pivote: fila ${pivotRowIdx}, columna ${headers[pivotCol]} (${pivotCol + 1})`);
    pivotOperation(tableau, pivotRowIdx, pivotCol);
    allIterations.push(cloneTableau(tableau));
    printTableau(tableau, iter, 'Fase 1');
    iterCount = iter;
  }

  // Verificar si W = 0
  const wNum = mathNumber(matrix[0]![totalCols - 1]!) as number;
  if (Math.abs(wNum) > 1e-10) {
    printStep(`W = ${wNum} ≠ 0. !Problema infactible!`);
    return { status: 'infeasible', iterations: allIterations };
  }

  printStep('W = 0. Fase 1 completada. Solucion basica factible encontrada.');

  // ═══════════════════════════════════════════════════════
  // FASE 2: Optimizar funcion objetivo original
  // ═══════════════════════════════════════════════════════
  printStep('══════ FASE 2: Optimizar funcion objetivo original ══════');

  // Construir nueva fila Z con la funcion objetivo original
  const newZRow: Fraction[] = new Array(totalCols).fill(null).map(() => fraction(0));
  for (let j = 0; j < numVariables; j++) {
    if (objectiveType === 'max') {
      newZRow[j] = unaryMinus(objectiveCoefficients[j]!) as Fraction;
    } else {
      newZRow[j] = objectiveCoefficients[j]!;
    }
  }
  // Coeficientes enormes para artificiales (las penalizamos para que no entren a la base)
  for (let i = 0; i < artificialCount; i++) {
    newZRow[artificialBase + i] = fraction(0);
  }
  newZRow[totalCols - 1] = fraction(0);

  // Reemplazar fila W por fila Z
  matrix[0] = newZRow;

  // Hacer ceros en las columnas de las variables basicas en la fila Z
  for (let i = 0; i < basisVariables.length; i++) {
    const bCol = basisVariables[i]!;
    if (notZero(matrix[0]![bCol]!)) {
      const factor = matrix[0]![bCol]!;
      for (let j = 0; j < totalCols; j++) {
        matrix[0]![j] = sub(
          matrix[0]![j]!,
          multiply(factor, matrix[i + 1]![j]!) as Fraction
        );
      }
    }
  }

  printTableau(tableau, iterCount + 1, 'Fase 2');

  // Resolver Fase 2 con Simplex (ignorando columnas artificiales)
  for (let iter = iterCount + 2; iter <= iterCount + MAX_ITERATIONS; iter++) {
    // Encontrar columna pivote (solo entre variables originales, holgura y exceso)
    let minVal = ZERO;
    let pivotCol = -1;
    for (let j = 0; j < artificialBase; j++) {
      if (lt(matrix[0]![j]!, minVal)) {
        minVal = matrix[0]![j]!;
        pivotCol = j;
      }
    }

    if (pivotCol === -1) {
      // Solucion optima
      printStep('No hay coeficientes negativos. !Solucion optima encontrada!');
      return buildTwoPhaseSolution(tableau, allIterations, numVariables, objectiveType);
    }

    const pivotRowIdx = findPivotRow(tableau, pivotCol);
    if (pivotRowIdx === -1) {
      printStep('Problema no acotado.');
      return { status: 'unbounded', iterations: allIterations };
    }

    printStep(`Pivote: fila ${pivotRowIdx}, columna ${headers[pivotCol]} (${pivotCol + 1})`);
    pivotOperation(tableau, pivotRowIdx, pivotCol);
    allIterations.push(cloneTableau(tableau));
    printTableau(tableau, iter, 'Fase 2');
  }

  return { status: 'infeasible', iterations: allIterations };
}

/**
 * Extrae la solucion de Dos Fases.
 */
function buildTwoPhaseSolution(
  tableau: SimplexTableau,
  iterations: SimplexTableau[],
  numOriginalVars: number,
  objectiveType: string
): Solution {
  const matrix = tableau.matrix;
  const rhsCol = matrix[0]!.length - 1;

  let objectiveValue = matrix[0]![rhsCol]!;
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

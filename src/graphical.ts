import { fraction, number as mathNumber, compare, multiply, subtract, divide, add, format } from 'mathjs';
import type { Fraction } from 'mathjs';
import type { LinearProblem, Solution } from './types.js';
import { printStep } from './utils/formatter.js';

interface Point {
  x: number;
  y: number;
}

/**
 * Resuelve un problema de programacion lineal con 2 variables usando el Metodo Grafico.
 */
export function solveGraphical(problem: LinearProblem): Solution {
  printStep('Iniciando Metodo Grafico...');

  const { objectiveType, objectiveCoefficients, constraints, numVariables } = problem;

  if (numVariables !== 2) {
    printStep('Error: El metodo grafico solo funciona con 2 variables.');
    return { status: 'infeasible', iterations: [] };
  }

  printStep('Calculando intersecciones y vertices de la region factible...');

  // Recopilar todas las rectas (restricciones + ejes x >= 0, y >= 0)
  interface Line {
    a: number;  // coef de x
    b: number;  // coef de y
    c: number;  // lado derecho
    type: string;
  }

  const lines: Line[] = [];

  // Restricciones del problema
  for (const constraint of constraints) {
    lines.push({
      a: mathNumber(constraint.coefficients[0]!) as number,
      b: mathNumber(constraint.coefficients[1]!) as number,
      c: mathNumber(constraint.rhs) as number,
      type: constraint.type,
    });
  }

  // Restricciones de no-negatividad
  lines.push({ a: 1, b: 0, c: 0, type: '>=' }); // x >= 0
  lines.push({ a: 0, b: 1, c: 0, type: '>=' }); // y >= 0

  // Encontrar todos los puntos de interseccion entre pares de rectas
  const candidates: Point[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const l1 = lines[i]!;
      const l2 = lines[j]!;

      const det = l1.a * l2.b - l1.b * l2.a;
      if (Math.abs(det) < 1e-10) continue; // Lineas paralelas

      const x = (l1.c * l2.b - l1.b * l2.c) / det;
      const y = (l1.a * l2.c - l1.c * l2.a) / det;

      candidates.push({ x, y });
    }
  }

  // Filtrar: solo puntos que satisfacen TODAS las restricciones
  const feasibleVertices: Point[] = [];

  for (const point of candidates) {
    let feasible = true;

    for (const line of lines) {
      const lhs = line.a * point.x + line.b * point.y;

      if (line.type === '<=' && lhs > line.c + 1e-9) {
        feasible = false;
        break;
      } else if (line.type === '>=' && lhs < line.c - 1e-9) {
        feasible = false;
        break;
      } else if (line.type === '=' && Math.abs(lhs - line.c) > 1e-9) {
        feasible = false;
        break;
      }
    }

    if (feasible) {
      // Evitar duplicados
      const isDuplicate = feasibleVertices.some(
        v => Math.abs(v.x - point.x) < 1e-9 && Math.abs(v.y - point.y) < 1e-9
      );
      if (!isDuplicate) {
        feasibleVertices.push(point);
      }
    }
  }

  if (feasibleVertices.length === 0) {
    printStep('No se encontraron vertices factibles. !Problema infactible!');
    return { status: 'infeasible', iterations: [] };
  }

  // Mostrar vertices factibles
  printStep('Vertices de la region factible:');
  console.log('');
  console.log('  ┌──────────┬──────────┬──────────────┐');
  console.log('  │    x₁    │    x₂    │     Z        │');
  console.log('  ├──────────┼──────────┼──────────────┤');

  const c1 = mathNumber(objectiveCoefficients[0]!) as number;
  const c2 = mathNumber(objectiveCoefficients[1]!) as number;

  interface EvalPoint {
    point: Point;
    z: number;
  }

  const evaluated: EvalPoint[] = [];

  for (const v of feasibleVertices) {
    const z = c1 * v.x + c2 * v.y;
    evaluated.push({ point: v, z });

    const xStr = v.x.toFixed(4).padStart(8);
    const yStr = v.y.toFixed(4).padStart(8);
    const zStr = z.toFixed(4).padStart(12);
    console.log(`  │ ${xStr} │ ${yStr} │ ${zStr} │`);
  }

  console.log('  └──────────┴──────────┴──────────────┘');

  // Encontrar el vertice optimo
  let optimalIdx = 0;
  for (let i = 1; i < evaluated.length; i++) {
    if (objectiveType === 'max') {
      if (evaluated[i]!.z > evaluated[optimalIdx]!.z) {
        optimalIdx = i;
      }
    } else {
      if (evaluated[i]!.z < evaluated[optimalIdx]!.z) {
        optimalIdx = i;
      }
    }
  }

  const optimal = evaluated[optimalIdx]!;
  const optPoint = optimal.point;

  printStep(`Vertice optimo: (${optPoint.x.toFixed(4)}, ${optPoint.y.toFixed(4)})`);

  // Convertir a fracciones para la solucion
  const objVal = fraction(optimal.z);
  const vars = [fraction(optPoint.x), fraction(optPoint.y)];

  return {
    status: 'optimal',
    objectiveValue: objVal,
    variables: vars,
    iterations: [],
  };
}

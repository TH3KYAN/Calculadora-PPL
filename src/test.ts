/**
 * Test script para verificar los 4 metodos sin interaccion del usuario.
 * Ejecutar con: npx tsx src/test.ts
 */
import { fraction } from 'mathjs';
import type { LinearProblem } from './types.js';
import { solveSimplex } from './simplex.js';
import { solveDual } from './dual.js';
import { solveTwoPhase } from './twoPhase.js';
import { solveGraphical } from './graphical.js';
import { printSolution } from './utils/formatter.js';

// ═══════════════════════════════════════════
// TEST 1: Metodo Simplex
// Max Z = 3x₁ + 5x₂
// s.a. x₁ <= 4, 2x₂ <= 12, 3x₁ + 5x₂ <= 25
// Solucion esperada: Z = 25, x₁ = 0, x₂ = 5... 
// Recalculemos: x₁<=4, x₂<=6, 3x₁+5x₂<=25
// Si x₁=0, x₂=5 → Z=25. Si x₁=4, x₂=13/5=2.6 → Z=12+13=25... Multiples optimos
// ═══════════════════════════════════════════
console.log('\n\n====== TEST 1: METODO SIMPLEX ======');
const problem1: LinearProblem = {
  objectiveType: 'max',
  objectiveCoefficients: [fraction(3), fraction(5)],
  constraints: [
    { coefficients: [fraction(1), fraction(0)], type: '<=', rhs: fraction(4) },
    { coefficients: [fraction(0), fraction(2)], type: '<=', rhs: fraction(12) },
    { coefficients: [fraction(3), fraction(5)], type: '<=', rhs: fraction(25) },
  ],
  numVariables: 2,
};
const sol1 = solveSimplex(problem1);
printSolution(sol1, 'MEtodo Simplex', 2);

// ═══════════════════════════════════════════
// TEST 2: Metodo Dual Simplex
// Min Z = 2x₁ + 3x₂
// s.a. x₁ + x₂ >= 4, x₁ + 3x₂ >= 6
// Solucion esperada: Z = 9, x₁ = 3, x₂ = 1
// ═══════════════════════════════════════════
console.log('\n\n====== TEST 2: METODO SIMPLEX DUAL ======');
const problem2: LinearProblem = {
  objectiveType: 'min',
  objectiveCoefficients: [fraction(2), fraction(3)],
  constraints: [
    { coefficients: [fraction(1), fraction(1)], type: '>=', rhs: fraction(4) },
    { coefficients: [fraction(1), fraction(3)], type: '>=', rhs: fraction(6) },
  ],
  numVariables: 2,
};
const sol2 = solveDual(problem2);
printSolution(sol2, 'Metodo Simplex Dual', 2);

// ═══════════════════════════════════════════
// TEST 3: Metodo de Dos Fases
// Max Z = 5x₁ + 4x₂
// s.a. 6x₁ + 4x₂ <= 24, x₁ + 2x₂ <= 6, x₁ + x₂ >= 1
// ═══════════════════════════════════════════
console.log('\n\n====== TEST 3: METODO DE DOS FASES ======');
const problem3: LinearProblem = {
  objectiveType: 'max',
  objectiveCoefficients: [fraction(5), fraction(4)],
  constraints: [
    { coefficients: [fraction(6), fraction(4)], type: '<=', rhs: fraction(24) },
    { coefficients: [fraction(1), fraction(2)], type: '<=', rhs: fraction(6) },
    { coefficients: [fraction(1), fraction(1)], type: '>=', rhs: fraction(1) },
  ],
  numVariables: 2,
};
const sol3 = solveTwoPhase(problem3);
printSolution(sol3, 'Metodo Dos Fases', 2);

// ═══════════════════════════════════════════
// TEST 4: Metodo Grafico
// Max Z = 5x₁ + 4x₂
// s.a. x₁ + x₂ <= 5, 10x₁ + 6x₂ <= 45
// Solucion esperada: Z = 23.75, x₁ = 3.75, x₂ = 1.25
// ═══════════════════════════════════════════
console.log('\n\n====== TEST 4: METODO GRAFICO ======');
const problem4: LinearProblem = {
  objectiveType: 'max',
  objectiveCoefficients: [fraction(5), fraction(4)],
  constraints: [
    { coefficients: [fraction(1), fraction(1)], type: '<=', rhs: fraction(5) },
    { coefficients: [fraction(10), fraction(6)], type: '<=', rhs: fraction(45) },
  ],
  numVariables: 2,
};
const sol4 = solveGraphical(problem4);
printSolution(sol4, 'Metodo Grafico', 2);

console.log('\n\n====== TODAS LAS PRUEBAS COMPLETADAS ======\n');

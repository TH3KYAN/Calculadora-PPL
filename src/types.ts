import type { Fraction } from 'mathjs';

// Tipo de optimizacion
export type ObjectiveType = 'max' | 'min';

// Tipo de restriccion
export type ConstraintType = '<=' | '>=' | '=';

// Modelo del problema de PL
export interface LinearProblem {
  objectiveType: ObjectiveType;
  objectiveCoefficients: Fraction[];
  constraints: Constraint[];
  numVariables: number;
}

// Una restriccion individual
export interface Constraint {
  coefficients: Fraction[];
  type: ConstraintType;
  rhs: Fraction;
}

// Tabla Simplex
export interface SimplexTableau {
  matrix: Fraction[][];
  basisVariables: number[];
  headers: string[];
}

// Estado de la solucion
export type SolutionStatus = 'optimal' | 'unbounded' | 'infeasible';

// Resultado de la solucion
export interface Solution {
  status: SolutionStatus;
  objectiveValue?: Fraction;
  variables?: Fraction[];
  iterations: SimplexTableau[];
}

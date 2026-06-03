import { fraction } from 'mathjs';
import type { Fraction } from 'mathjs';
import * as readline from 'readline-sync';
import type { LinearProblem, ObjectiveType, ConstraintType, Constraint } from './types.js';

/**
 * Captura un problema de programacion lineal completo del usuario.
 */
export function captureProblem(): LinearProblem {
  console.log('');

  // Tipo de optimizacion
  const objChoice = readline.questionInt(
    '  ?Tipo de optimizacion?\n  1. Maximizar\n  2. Minimizar\n  Opcion: '
  );
  const objectiveType: ObjectiveType = objChoice === 2 ? 'min' : 'max';

  console.log(`\n  Tipo seleccionado: ${objectiveType === 'max' ? 'MAXIMIZAR' : 'MINIMIZAR'}`);

  // Numero de variables
  const numVariables = readline.questionInt('\n  ?Cuantas variables de decision? ');

  // Coeficientes de la funcion objetivo
  console.log('\n  Ingrese los coeficientes de la funcion objetivo:');
  console.log(`  Z = c₁x₁ + c₂x₂ + ... + c${numVariables}x${numVariables}`);
  const objectiveCoefficients: Fraction[] = [];
  for (let i = 0; i < numVariables; i++) {
    const val = readline.question(`  c${i + 1} (coeficiente de x${i + 1}): `);
    objectiveCoefficients.push(parseFraction(val));
  }

  // Numero de restricciones
  const numConstraints = readline.questionInt('\n  ?Cuantas restricciones? ');

  // Restricciones
  const constraints: Constraint[] = [];
  for (let i = 0; i < numConstraints; i++) {
    console.log(`\n  ── Restriccion ${i + 1} ──`);
    console.log(`  Formato: a₁x₁ + a₂x₂ + ... (<=, >=, =) b`);

    const coefficients: Fraction[] = [];
    for (let j = 0; j < numVariables; j++) {
      const val = readline.question(`  a${j + 1} (coeficiente de x${j + 1}): `);
      coefficients.push(parseFraction(val));
    }

    const typeChoice = readline.questionInt(
      '  Tipo de restriccion:\n  1. <=\n  2. >=\n  3. =\n  Opcion: '
    );
    const type: ConstraintType = typeChoice === 2 ? '>=' : typeChoice === 3 ? '=' : '<=';

    const rhsVal = readline.question('  Lado derecho (b): ');
    const rhs = parseFraction(rhsVal);

    constraints.push({ coefficients, type, rhs });
  }

  // Mostrar resumen
  printProblemSummary(objectiveType, objectiveCoefficients, constraints, numVariables);

  return {
    objectiveType,
    objectiveCoefficients,
    constraints,
    numVariables,
  };
}

/**
 * Parsea un string a fraccion. Acepta: "3", "3/4", "-1/2", "0.5"
 */
function parseFraction(input: string): Fraction {
  const trimmed = input.trim();
  try {
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      const num = parseInt(parts[0]!, 10);
      const den = parseInt(parts[1]!, 10);
      return fraction(num, den);
    }
    return fraction(parseFloat(trimmed));
  } catch {
    console.log(`  ⚠️  Valor invalido "${trimmed}", usando 0.`);
    return fraction(0);
  }
}

/**
 * Imprime un resumen del problema capturado.
 */
function printProblemSummary(
  objectiveType: ObjectiveType,
  objectiveCoefficients: Fraction[],
  constraints: Constraint[],
  numVariables: number
): void {
  console.log('\n  ═══════════════════════════════════════');
  console.log('  RESUMEN DEL PROBLEMA');
  console.log('  ═══════════════════════════════════════');

  // Funcion objetivo
  let objStr = `  ${objectiveType === 'max' ? 'Max' : 'Min'} Z = `;
  for (let i = 0; i < numVariables; i++) {
    if (i > 0) objStr += ' + ';
    objStr += `(${objectiveCoefficients[i]})x${i + 1}`;
  }
  console.log(objStr);

  // Restricciones
  console.log('  Sujeto a:');
  for (let i = 0; i < constraints.length; i++) {
    const c = constraints[i]!;
    let cStr = '    ';
    for (let j = 0; j < numVariables; j++) {
      if (j > 0) cStr += ' + ';
      cStr += `(${c.coefficients[j]})x${j + 1}`;
    }
    cStr += ` ${c.type} ${c.rhs}`;
    console.log(cStr);
  }
  console.log('    xᵢ >= 0');
  console.log('  ═══════════════════════════════════════\n');
}

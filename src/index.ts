import * as readline from 'readline-sync';
import { solveSimplex } from './simplex.js';
import { solveDual } from './dual.js';
import { solveTwoPhase } from './twoPhase.js';
import { solveGraphical } from './graphical.js';
import { captureProblem } from './input.js';
import { printSolution } from './utils/formatter.js';

function showMenu(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║                                              ║');
  console.log('║   📐 CALCULADORA DE PROGRAMACION LINEAL 📐   ║');
  console.log('║                                              ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║                                              ║');
  console.log('║   1. Metodo Simplex                          ║');
  console.log('║   2. Metodo Simplex Dual                     ║');
  console.log('║   3. Metodo Grafico (2 variables)            ║');
  console.log('║   4. Metodo de Dos Fases                     ║');
  console.log('║   5. Salir                                   ║');
  console.log('║                                              ║');
  console.log('╚══════════════════════════════════════════════╝');
}

function main(): void {
  console.clear();
  console.log('');
  console.log('  ╔═════════════════════════════════════════════════╗');
  console.log('  ║                                                 ║');
  console.log('  ║   Bienvenido a la Calculadora de               ║');
  console.log('  ║   Programacion Lineal                           ║');
  console.log('  ║                                                 ║');
  console.log('  ║   Metodos disponibles:                          ║');
  console.log('  ║   • Simplex          • Simplex Dual             ║');
  console.log('  ║   • Grafico          • Dos Fases                ║');
  console.log('  ║                                                 ║');
  console.log('  ╚═════════════════════════════════════════════════╝');

  let running = true;

  while (running) {
    showMenu();

    const choice = readline.questionInt('\n  Seleccione una opcion (1-5): ');

    switch (choice) {
      case 1: {
        console.log('\n  ─── METODO SIMPLEX ───');
        console.log('  (Requiere restricciones tipo <= con RHS >= 0)');
        const problem = captureProblem();
        const solution = solveSimplex(problem);
        printSolution(solution, 'Metodo Simplex', problem.numVariables);
        break;
      }
      case 2: {
        console.log('\n  ─── METODO SIMPLEX DUAL ───');
        console.log('  (Ideal para restricciones tipo >=)');
        const problem = captureProblem();
        const solution = solveDual(problem);
        printSolution(solution, 'Metodo Simplex Dual', problem.numVariables);
        break;
      }
      case 3: {
        console.log('\n  ─── METODO GRAFICO ───');
        console.log('  (Solo para problemas con 2 variables)');
        const problem = captureProblem();
        if (problem.numVariables !== 2) {
          console.log('\n  ⚠️  El metodo grafico solo funciona con 2 variables.');
          break;
        }
        const solution = solveGraphical(problem);
        printSolution(solution, 'Metodo Grafico', problem.numVariables);
        break;
      }
      case 4: {
        console.log('\n  ─── METODO DE DOS FASES ───');
        console.log('  (Funciona con cualquier tipo de restriccion: <=, >=, =)');
        const problem = captureProblem();
        const solution = solveTwoPhase(problem);
        printSolution(solution, 'Metodo Dos Fases', problem.numVariables);
        break;
      }
      case 5: {
        running = false;
        console.log('\n  !Hasta luego! 👋\n');
        break;
      }
      default: {
        console.log('\n  ⚠️  Opcion no valida. Intente de nuevo.');
      }
    }

    if (running) {
      const again = readline.keyInYN('\n  ?Desea resolver otro problema?');
      if (!again) {
        running = false;
        console.log('\n  !Hasta luego! 👋\n');
      }
    }
  }
}

main();
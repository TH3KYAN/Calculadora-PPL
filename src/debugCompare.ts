import { fraction, compare } from 'mathjs';

const a = fraction(-3);
const b = fraction(0);
const result = compare(a, b);
console.log('compare result:', result);
console.log('type:', typeof result);
console.log('=== -1:', result === -1);
console.log('== -1:', result == -1);
console.log('< 0:', result < 0);
console.log('Number():', Number(result));

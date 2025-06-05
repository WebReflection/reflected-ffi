import { fromSymbol, toSymbol } from '../src/symbol.js';

console.assert(fromSymbol(toSymbol(Symbol.iterator)) === Symbol.iterator);
console.assert(fromSymbol(toSymbol(Symbol.for('iterator'))) === Symbol.for('iterator'));
console.assert(fromSymbol(toSymbol(Symbol('iterator'))).description === 'iterator');
console.assert(fromSymbol(toSymbol(Symbol())).description === void 0);

import { fromSymbol, toSymbol } from '../src/utils/symbol.js';

const is = (a, b) => {
  if (!Object.is(a, b)) {
    console.warn('provided', a);
    console.warn('expected', b);
    throw new Error('FAILED');
  }
};

is(toSymbol(Symbol.iterator), '@iterator');
is(toSymbol(Symbol.for('iterator')), '#iterator');
is(toSymbol(Symbol('iterator')), '!iterator');
is(toSymbol(Symbol()), '?');

is(fromSymbol(toSymbol(Symbol.iterator)), Symbol.iterator);
is(fromSymbol(toSymbol(Symbol.for('iterator'))), Symbol.for('iterator'));
is(fromSymbol(toSymbol(Symbol('iterator'))).description, 'iterator');
is(fromSymbol(toSymbol(Symbol())).description, void 0);

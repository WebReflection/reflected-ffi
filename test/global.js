import { toName, toTag } from '../src/utils/global.js';

const is = (a, b) => {
  if (!Object.is(a, b)) {
    console.warn('provided', a);
    console.warn('expected', b);
    throw new Error('FAILED');
  }
};

class Extend extends Uint8Array {
  get [Symbol.toStringTag]() { return 'Extend' }
}

is(toName(Symbol.iterator), 'Symbol');
is(toName(Object.create(null)), 'Object');
is(toName(new Extend([])), 'Object');
is(toName({}), 'Object');

is(toTag(new Extend([])), 'Uint8Array');

is(toName(Object.create(null, { [Symbol.toStringTag]: { value: 'Fake' } })), 'Object');

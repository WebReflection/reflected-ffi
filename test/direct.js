import { encode, encoder } from '../src/direct/encoder.js';
import { decode, decoder } from '../src/direct/decoder.js';

const roundtrip = value => decode(new Uint8Array(encode(value)));

const assert = (value, log = false) => {
  const result = roundtrip(value);
  if (log) console.log(result);
  if (!(Object.is(result, value) || JSON.stringify(result) === JSON.stringify(value)))
    throw new Error(value);
};

class Unknown extends Error {
  get name() { return 'Unknown' }
}

assert(true);
assert(false);
assert(NaN);
assert(Infinity);
assert(-Infinity);
assert(0);
assert(-0);
assert(1.23);
assert(-1.23);
assert(123);
assert(-123);
assert(null);
assert(undefined);
assert(1n);
assert(-1n);
assert('test');
assert('🥳');
assert(['a', 'b', 'a']);
assert(Symbol.iterator);
assert(Symbol.for('iterator'));
const date = new Date;
assert([date, date]);
assert(new Map([['a', 1], ['b', 2]]));
assert(new Set([1, 2, 3]));
assert(new Error('test'));
assert(new Unknown('test'));
assert({a: 123});
assert(/test/gi);
assert('string'.repeat(2 ** 16));

console.assert(roundtrip(new Int32Array([1, 2, 3])) instanceof Int32Array);
console.assert(roundtrip(new Int32Array([1, 2, 3])).join(',') === '1,2,3');

console.assert(roundtrip({ toJSON: () => 123 }) === 123);
console.assert(roundtrip({ toJSON() { return this }}) === null);

const sab = new SharedArrayBuffer(4, { maxByteLength: 100 });
const enc = encoder({ byteOffset: 0 });
const dec = decoder({ byteOffset: 0 });

const written = enc('hello encoder', sab);
console.assert(written === 5 + 'hello encoder'.length);
console.assert(dec(written, sab) === 'hello encoder');

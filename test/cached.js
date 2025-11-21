import { encode } from '../src/direct/encoder.js';
import { decode } from '../src/direct/decoder.js';

const error = new Error('test');
const regexp = new RegExp('test');

const roundtrip = value => {
  const encoded = encode(value);
  const decoded = decode(Uint8Array.from(encoded));
  return decoded;
};

const input = [1, error, regexp, error, regexp, 2];
let result = roundtrip(input);

console.assert(result[0] === input[0]);
console.assert(result.at(-1) === input.at(-1));
console.assert(result[1] === result[3]);
console.assert(result[1] instanceof Error);
console.assert(result[2] === result[4]);
console.assert(result[2] instanceof RegExp);
console.assert(result.length === input.length);

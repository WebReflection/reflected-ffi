import { decode } from '../src/direct/decoder.js';
import { encoder } from '../src/direct/encoder.js';
import { Array, Buffer } from '../src/direct/buffer.js';

const encode = encoder({ Array: Buffer });

const buffer = new Array;

const source = [
  1,
  [2, 3],
  new TextEncoder().encode('456').buffer,
  [7, 8, 9]
];

const result = encode(source, buffer);

const revived = decode(new Uint8Array(buffer.value));

console.assert(result === 35);
console.assert(result === buffer.value.byteLength);
console.assert(revived[0] === source[0]);
console.assert(JSON.stringify(revived[1]) === JSON.stringify(source[1]));
console.assert(new TextDecoder().decode(new Uint8Array(revived[2])) === new TextDecoder().decode(new Uint8Array(source[2])));
console.assert(JSON.stringify(revived[3]) === JSON.stringify(source[3]));
console.assert(revived.length === source.length);

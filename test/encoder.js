import {
  DIRECT,
  STRING,
  VIEW,
  BUFFER,
} from '../src/types.js';

import { toBuffer, toView } from '../src/utils/typed.js';

import { encode, encoder } from '../src/buffer/encoder.js';
import { decode, decoder } from '../src/buffer/decoder.js';

const sab = new SharedArrayBuffer(0, { maxByteLength: 1024 });

const buffer = new ArrayBuffer(3, { maxByteLength: 6 });
const ui8a = new Uint8Array(buffer, 1);
ui8a.set([1, 2]);

encode([BUFFER, toBuffer(buffer)], sab)

console.log(new Uint8Array(decode(sab)));
console.log(encode([VIEW, toView(new Float32Array([1.1, 1.2, 1.3]))], sab));

console.log(new Uint8Array(sab).slice(0, 100));
console.log(decode(sab));

console.log(encode([DIRECT, { a: 1, b: 2 }], sab));
console.log(decode(sab));


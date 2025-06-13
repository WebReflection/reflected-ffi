import {
  DIRECT,
  REMOTE,
  BUFFER,
  STRING,
  VIEW,
} from '../src/types.js';

import { toBuffer, toView } from '../src/utils/typed.js';

import { encode, encoder } from '../src/buffer/encoder.js';
import { decode, decoder } from '../src/buffer/decoder.js';

const sab = new SharedArrayBuffer(8, { maxByteLength: 1024 });

const buffer = new ArrayBuffer(3, { maxByteLength: 6 });
const ui8a = new Uint8Array(buffer, 1);
ui8a.set([1, 2]);

let written = encode([BUFFER, toBuffer(buffer)], sab);
console.assert(written === 9 + buffer.byteLength);
console.assert([...new Uint8Array(decode(new Uint8Array(sab, 0, written).buffer), 1)].join(',') === '1,2');

let before = written;
written = encode([VIEW, toView(ui8a)], sab);
console.assert(written === before + 13 + Uint8Array.name.length * 2);
console.assert(decode(sab).byteOffset === 1);
console.assert(decode(new Uint8Array(sab, 0, written).buffer).byteOffset === 1);
console.assert(decode(new Uint8Array(sab, 0, written).buffer).length === 2);

const bi64a = new BigInt64Array([1n, 2n]);
written = encode([VIEW, toView(new BigInt64Array(bi64a.buffer, 0, 1))], sab);
console.assert(written === 9 + bi64a.buffer.byteLength + 13 + BigInt64Array.name.length * 2);
console.assert(decode(sab) instanceof BigInt64Array);
console.assert(decode(sab).byteOffset === 0);
console.assert(decode(sab).length === 1);

written = encode([DIRECT, { a: 1, b: 2 }], sab);
console.assert(written === 5 + JSON.stringify({ a: 1, b: 2 }).length * 2);
console.assert(JSON.stringify(decode(sab)) === '{"a":1,"b":2}');

written = encode(true, sab);
console.assert(decode(sab) === true);
console.assert(written === 5 + JSON.stringify(true).length * 2);

written = encode([REMOTE, 1], sab);
console.assert(written === 5);

console.assert(decode(sab).join(',') === `${REMOTE},1`);

written = encode([DIRECT, 'ok'], sab, {
  direct: value => new TextEncoder().encode(value),
});

console.assert(written === 5 + 'ok'.length);

console.assert(decode(sab, {
  direct: value => new TextDecoder().decode(value),
}).join(',') === `${DIRECT},ok`);

written = encode(undefined, sab);
console.assert(written === 5);

console.assert(decode(sab) === undefined);

encode([DIRECT, 'ok'], sab, { direct: value => new TextEncoder().encode(value) });
console.assert(decode(sab, { direct: value => new TextDecoder().decode(value) }).join(',') === `${DIRECT},ok`);

encode('ok', sab, { direct: value => new TextEncoder().encode(value) });
console.assert(decode(sab, { direct: value => new TextDecoder().decode(value) }).join(',') === `${DIRECT},ok`);

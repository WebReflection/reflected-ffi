import { encoder } from '../src/direct/encoder.js';
import { decoder } from '../src/direct/decoder.js';

const encode = encoder();
const blob = new Blob(['hello', 'world'], { type: 'application/json' });

const decode = decoder();

const sab = new SharedArrayBuffer(8, { maxByteLength: 8048 });
let length = await encode(['a', blob, 'c'], sab);

let decoded = decode(length, sab);

console.assert(decoded[1].type === await blob.type);
console.assert(decoded[1].size === await blob.size);
console.assert(await decoded[1].text() === await blob.text());
console.assert(decoded[0] === 'a');
console.assert(decoded[2] === 'c');

const file = new File([blob], 'test.txt', { type: blob.type });
length = await encode(['a', file, 'c'], sab);

decoded = decode(length, sab);

console.assert(decoded[1].type === await blob.type);
console.assert(decoded[1].size === await blob.size);
console.assert(await decoded[1].text() === await file.text());
console.assert(decoded[0] === 'a');
console.assert(decoded[2] === 'c');


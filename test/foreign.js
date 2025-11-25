import { encode } from '../src/direct/encoder.js';
import { decode } from '../src/direct/decoder.js';

import { ForeignArray, ForeignSet } from '../src/direct/foreign.js';

const fs = decode(encode(new ForeignSet([1, 2, 3])));
console.assert(fs instanceof ForeignSet, 'fs is not a ForeignSet');
console.assert(fs.size === 3, 'fs.size is not 3');
console.assert(fs.has(1), 'fs.has(1) is not true');
console.assert(fs.has(2), 'fs.has(2) is not true');
console.assert(fs.has(3), 'fs.has(3) is not true');

const fa = decode(encode(new ForeignArray(1, 2, 3)));
console.assert(fa instanceof ForeignArray, 'fa is not a ForeignArray');
console.assert(fa.length === 3, 'fa.length is not 3');
console.assert(fa[0] === 1, 'fa[0] is not 1');
console.assert(fa[1] === 2, 'fa[1] is not 2');
console.assert(fa[2] === 3, 'fa[2] is not 3');

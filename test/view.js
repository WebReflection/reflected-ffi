import { fromView, toView } from '../src/utils/typed.js';

const buffer = new ArrayBuffer(12, { maxByteLength: 24 });

let i32a = new Int32Array(buffer, 4, 1);
i32a[0] = 1;

console.assert(i32a.length === i32a[0]);

let copy = fromView(toView(i32a, false), false);

console.assert(copy.byteOffset === i32a.byteOffset);
console.assert(copy.length === i32a.length);
console.assert(copy[0] === i32a[0]);

let ui8a = new Uint8Array([1, 2, 3]);
copy = fromView(toView(ui8a, false), false);
console.assert(copy.byteOffset === ui8a.byteOffset);
console.assert(copy.length === ui8a.length);
console.assert(copy[0] === ui8a[0]);
console.assert(copy[1] === ui8a[1]);
console.assert(copy[2] === ui8a[2]);

copy = fromView(toView(ui8a, true), true);
console.assert(copy.byteOffset === ui8a.byteOffset);
console.assert(copy.length === ui8a.length);
console.assert(copy[0] === ui8a[0]);
console.assert(copy[1] === ui8a[1]);
console.assert(copy[2] === ui8a[2]);

ui8a = new Uint8Array(new ArrayBuffer(3, { maxByteLength: 6 }));
copy = fromView(toView(ui8a, true), true);
console.assert(copy.byteOffset === ui8a.byteOffset);
console.assert(copy.length === ui8a.length);
console.assert(copy[0] === ui8a[0]);
console.assert(copy[1] === ui8a[1]);
console.assert(copy[2] === ui8a[2]);

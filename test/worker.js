import remote from '../src/remote.js';
import { decoder } from '../src/direct/decoder.js';

const sab = new SharedArrayBuffer(8, { maxByteLength: 1 << 26 });
const i32a = new Int32Array(sab);
const decode = decoder({ byteOffset: 8 });

const { global, direct, evaluate, gather, assign, reflect } = remote({
  timeout: 0,
  buffer: true,
  reflect(...args) {
    postMessage([i32a, args]);
    if (args[0]) {
      Atomics.wait(i32a, 0);
      i32a[0] = 0;
      return decode(i32a[1], i32a.buffer);
    }
  },
});

onmessage = async ({ data: [id, args] }) => {
  postMessage([id, await reflect(...args)]);
};


const { testArray, testObject } = global;
testArray.push(123);
testObject.a = 456;
console.log(global.testArray, global.testObject);

console.log(new global.Date());
console.log('ImageData', new global.ImageData(new Uint8ClampedArray([1, 2, 3, 4]), 1, 1, { colorSpace: 'srgb' }));

const { log } = global.console;
const obj = { a: 123 };

assign(global.testObject, { b: 789 }, { c: 101112 });
log('testObject', global.testObject);

// debugger;
log(obj, [456], obj, Symbol.iterator, Symbol.for('iterator'), new Uint8Array(2));

let { body } = global.document;
body.textContent = 'click me';

/** @param {Event} event */
body.onclick = event => {
  const [ target, type ] = gather(event, 'target', 'type');
  target.append(' ', type);
};
body = null;

global.shenanigans = () => 456;


const { Int16Array } = global;
let i16a;

console.time('Int16Array');
i16a = new Int16Array(1 << 20);
console.timeEnd('Int16Array');
console.log(i16a.length);

console.time('Int16Array');
i16a = new Int16Array(1 << 10);
console.timeEnd('Int16Array');
console.log(i16a.length);

console.time('Int16Array');
i16a = new Int16Array(1 << 20);
console.timeEnd('Int16Array');
console.log(i16a.length);

console.log({ check: global.check }, 'check' in global);
global.check = void 0;
console.log({ check: global.check }, 'check' in global, global.check);


console.log(await global.fetch(global.location.href).then(r => r.text()));

console.log(await evaluate(async (a, b) => a + b, 1, 2));

console.time('not cached');
(global.document);
(global.document.body);
(global.document.body.textContent);
console.timeEnd('not cached');


console.time('cached');
(global.Object);
(global.Object.prototype);
(global.Object.prototype.toString);
console.timeEnd('cached');

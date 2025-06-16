import local from '../src/local.js';
import remote from '../src/remote.js';

const array = [1, 2, 3];

const there = remote({
  buffer: true,
  reflect: (...args) => here.reflect(...args),
  transform: value => value === array ? there.direct(array) : value,
});

const here = local({
  buffer: true,
  reflect: (...args) => there.reflect(...args),
  transform: value => value === array ? here.direct(array) : value,
});

const { global } = there;

global.trapped = function trap() {};

console.assert(Object.isExtensible(global.Array));
console.assert('isArray' in global.Array);
console.assert(global.Array.isArray([]));
console.assert(global.Array.isArray(new global.Array));
console.assert(new global.Array instanceof global.Array);

for (const _ of new global.Array(1, 2, 3));

console.assert(global.Symbol.iterator in global.Array.prototype);
console.assert(!(Symbol.for('iterator') in global.Array.prototype));
console.assert(global.Object({}) instanceof global.Object);
console.assert(new global.Date instanceof global.Date);
console.assert(global.Object.getPrototypeOf(new global.Date) === global.Date.prototype);
console.assert(global.Reflect.isExtensible({}));

let obj = global.Object({});
obj.value = 123;
console.assert(obj.value === 123);
console.assert(Reflect.ownKeys(obj).length === 1);
console.assert(Reflect.ownKeys(obj)[0] === 'value');
console.assert(global.Object.is(obj, obj));
console.assert(!global.Object.is(obj, {}));
console.assert(!!Object.getOwnPropertyDescriptor(obj, 'value'));
console.assert(!!global.Object.getOwnPropertyDescriptor(obj, 'value'));
delete obj.value;
console.assert(!Object.getOwnPropertyDescriptor(obj, 'value'));
console.assert(!global.Object.getOwnPropertyDescriptor(obj, 'value'));

global.Object.defineProperty(obj, 'value', {
  configurable: true,
  get: global.Function('return "get"'),
  set: (_) => 'set',
});
console.assert(obj.value === 'get');

console.assert(Object.getPrototypeOf(obj) === global.Object.prototype);
console.assert(Reflect.setPrototypeOf(obj, null));
console.assert(Object.preventExtensions(obj));

let fn = global.Function('a', 'return a');
console.assert(fn(true));
console.assert(!!fn(globalThis));
console.assert(fn(global) === global);
console.assert(fn(null) === null);
console.assert(fn(Symbol.iterator) === Symbol.iterator);
console.assert(fn(new ArrayBuffer(12)) instanceof ArrayBuffer);
console.assert(fn(new Int32Array([1,2,3])) instanceof Int32Array);

console.assert(fn(Function) === fn(Function));

// visually check one is bound the other one isn't
console.log(fn(Function));
global.console.log(fn(Function));

console.assert(there.isProxy(global.JSON));
console.assert(there.isProxy(global.Array));
console.assert(!there.isProxy(null));
console.assert(!there.isProxy(false));

global.console.assert(fn(array) === array);
global.console.assert(fn(123n) === 123n);

console.assert(ArrayBuffer.isView(new global.Int32Array([1, 2, 3])));
console.assert((await global.import('../src/types.js')).DIRECT === 0);

console.assert(there.evaluate((a, b) => a + b, 1, 2) === 3, 'arrow');
console.assert(there.evaluate(function test(a, b) { return a + b }, 1, 2) === 3, 'named');
console.assert(there.evaluate({test(a, b) { return a + b }}.test, 1, 2) === 3, 'method');
console.assert(await there.evaluate(async function test(a, b) { return a + b }, 1, 2) === 3, 'async');

console.assert(there.query(global, 'Array.isArray.length') === there.query(globalThis, 'Array.isArray.length'));
console.assert(there.query(global, 'Array["isArray"]["length"]') === there.query(globalThis, 'Array.isArray.length'));
console.assert(there.query(global, 'Object.name[0]') === 'O');

Object.defineProperty(global, 'test', { value: 123 });
console.assert(global.test === 123);

global.setTimeout((a, b, c) => console.assert(a === 1 && b === 2 && c === 3), 10, 1, 2, 3);

let arr = new global.Array(1, 2, 3);
fn(here.direct([arr, arr]));

there.assign(global, { value: 1, array: [1, 2, 3] });
console.assert(there.gather(global, 'value')[0] === 1);
console.assert(there.gather(global, 'value').length === 1);
console.assert(there.gather(global, 'value', 'array').length === 2);
console.assert(there.gather(global, 'value', 'array[1]')[1] === 2);
console.assert(there.gather(global, Symbol.iterator)[0] === void 0);

obj = there.assign({}, { value: 1 });
console.assert(there.gather(obj, 'value')[0] === 1);
console.assert(there.gather(obj, 'value').length === 1);

global.console.log(new Uint8Array([1, 2, 3]));
console.log(new global.Uint8Array([1, 2, 3]));

obj = null;
global.trapped = null;

try {
  setTimeout(gc);
} catch (e) {
}
finally {
  setTimeout(function () {
    'use strict';
    global.console.log.apply(global.console, ['test', 'completed']);
    global.console.log.apply(global.console, arguments);
  }, 250, { ok: true });
}

setTimeout(here.terminate, 500);

import local from '../src/local.js';
import remote from '../src/remote.js';

const there = remote({
  reflect: (...args) => here.reflect(...args),
});

const here = local({
  reflect: (...args) => there.reflect(...args),
});

const { global } = there;

console.assert('isArray' in global.Array);
console.assert(global.Array.isArray([]));
console.assert(global.Array.isArray(new global.Array));
console.assert(new global.Array instanceof global.Array);

for (const _ of new global.Array(1, 2, 3));

console.assert(global.Symbol.iterator in global.Array.prototype);
console.assert(!(global.Symbol.for('iterator') in global.Array.prototype));
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

let arr = new global.Array(1, 2, 3);
fn(here.direct([arr, arr]));

obj = null;
try {
  setTimeout(gc);
  setTimeout(console.log, 250, 'done');
} catch (e) {
  setTimeout(console.log, 250, 'done');
}



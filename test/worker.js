import remote from '../src/remote.js';

const sab = new SharedArrayBuffer(1024);
const i32a = new Int32Array(sab);

const { global, direct, reflect } = remote({
  reflect(...args) {
    postMessage([i32a, args]);
    if (args[0] !== 'unref') {
      Atomics.wait(i32a, 0);
      const result = String.fromCharCode(...new Uint16Array(sab, 4, i32a[0]));
      i32a[0] = 0;
      return JSON.parse(result);
    }
  },
});

onmessage = async ({ data: [id, args] }) => {
  postMessage([id, await reflect(...args)]);
};

const { log } = global.console;
const obj = { a: 123 };

// debugger;
log(obj, [456], obj, Symbol.iterator, Symbol.for('iterator'), new Uint8Array(2));

global.document.body.textContent = 'click me';
global.document.body.onclick = event => {
  console.log(event.type);
  123;
};

global.shenanigans = () => 456;

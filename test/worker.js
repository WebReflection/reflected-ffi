import remote from '../src/remote.js';

const sab = new SharedArrayBuffer(1 << 26);
const i32a = new Int32Array(sab);

const { global, direct, reflect } = remote({
  reflect(...args) {
    postMessage([i32a, args]);
    if (args[0] !== 'unref') {
      Atomics.wait(i32a, 0);
      i32a[0] = 0;
      const length = i32a[1];
      if (length) {
        const ui16a = new Uint16Array(sab, 8, length);
        const { fromCharCode } = String;
        let str = '';
        for (let i = 0; i < length; i += 2048)
          str += fromCharCode.apply(null, ui16a.subarray(i, i + 2048));
        return JSON.parse(str);
      }
      return void 0;
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

const { log } = global.console;
const obj = { a: 123 };

// debugger;
log(obj, [456], obj, Symbol.iterator, Symbol.for('iterator'), new Uint8Array(2));

const { body } = global.document;
body.textContent = 'click me';
body.onclick = event => {
  body.append(' ', event.type);
};

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

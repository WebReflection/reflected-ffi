import remote from '../boilerplate/remote.js';
const { global, query } = remote();

const { pageLength } = global;
let length = 0;

console.time('warmup direct access');
length = global.document.documentElement.outerHTML.length;
console.timeEnd('warmup direct access');
console.assert(length === pageLength, 'warmup direct access');

console.time('hot direct access');
for (let i = 0; i < 10; i++)
  length = global.document.documentElement.outerHTML.length || 0;
console.timeEnd('hot direct access');
console.assert(length === pageLength, 'hot direct access');

console.time('warmup query');
length = query(global, 'document.documentElement.outerHTML.length');
console.timeEnd('warmup query');
console.assert(length === pageLength, 'warmup query');

console.time('hot query');
for (let i = 0; i < 10; i++)
  length = query(global, 'document.documentElement.outerHTML.length') || 0;
console.timeEnd('hot query');
console.assert(length === pageLength, 'hot query');


console.log(global.document.documentElement.outerHTML);

import nextResolver from 'https://esm.run/next-resolver';
const [next, resolve] = nextResolver();

import { encoder } from '../../src/direct/encoder.js';
const encode = encoder({ byteOffset: 8 });

import local from '../../src/local.js';

export default (url, options) => {
  const w = new Worker(url, { type: 'module' });

  const nmsp = local(Object.assign(
    {
      buffer: true,
      reflect(...args) {
        const [id, promise] = next();
        w.postMessage([id, args]);
        return promise;
      }
    },
    options,
  ));

  const { reflect } = nmsp;

  w.onmessage = ({ data: [i32a, args] }) => {
    if (typeof i32a === 'number')
      resolve(i32a, args);
    else {
      const result = reflect(...args);
      if (args[0]) {
        i32a[1] = encode(result, i32a.buffer);
        i32a[0] = 1;
        Atomics.notify(i32a, 0);
      }
    }
  };

  return nmsp;
};

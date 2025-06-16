import remote from '../../src/remote.js';
import { decoder } from '../../src/direct/decoder.js';
const decode = decoder({ byteOffset: 8 });

const sab = new SharedArrayBuffer(8, { maxByteLength: 1 << 26 });
const i32a = new Int32Array(sab);

export default options => {
  const nmsp = remote(Object.assign(
    {
      buffer: true,
      reflect(...args) {
        postMessage([i32a, args]);
        if (args[0]) {
          Atomics.wait(i32a, 0);
          i32a[0] = 0;
          return decode(i32a[1], i32a.buffer);
        }
      }
    },
    options,
  ));

  const { reflect } = nmsp;

  onmessage = async ({ data: [id, args] }) => {
    postMessage([id, await reflect(...args)]);
  };

  return nmsp;
};

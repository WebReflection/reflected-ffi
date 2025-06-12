import remote from '../../src/remote.js';
import { decoder } from '../../src/buffer/decoder.js';
import { decode as direct } from '../../src/direct/decoder.js';

const sab = new SharedArrayBuffer(8, { maxByteLength: 1 << 26 });
const i32a = new Int32Array(sab);
const decode = decoder({ dataView: new DataView(sab, 4), direct });

export default options => {
  const nmsp = remote(Object.assign(
    {
      reflect(...args) {
        postMessage([i32a, args]);
        if (args[0]) {
          Atomics.wait(i32a, 0);
          i32a[0] = 0;
          return decode(0, i32a.buffer);
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

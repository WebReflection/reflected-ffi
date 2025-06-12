import { decoder } from './text.js';

let canDecode = true;

try {
  decoder.decode(new Uint8Array(new SharedArrayBuffer(1)))
}
/* c8 ignore start */
catch (_) {
  canDecode = false;
}
/* c8 ignore stop */

export default canDecode;

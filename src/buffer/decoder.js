import {
  DIRECT,
  BUFFER,
  STRING,
  VIEW,
} from '../types.js';

import { arrayBuffer } from '../utils/typed.js';
import { decoder as td } from '../utils/text.js';

const { parse } = JSON;
const { fromCharCode } = String;

const asUTF16Chars = (dv, start, end) => {
  let string = '';
  while (end--) {
    string += fromCharCode(dv.getUint16(start, true));
    start += 2;
  }
  return string;
};

const asBUFFER = (dv, length, offset) => arrayBuffer(
  length,
  dv.getUint32(offset, true),
  new Uint8Array(dv.buffer, offset + 4, length)
);

let asDIRECT = (dv, length, offset) => new Uint8Array(dv.buffer, offset, length);

/* c8 ignore start */
// use zero-copy fast path when possible (NodeJS as example)
try { td.decode(new Uint8Array(new SharedArrayBuffer(1))) }
catch (_) {
  const direct = asDIRECT;
  asDIRECT = (dv, length, offset) => direct(dv, length, offset).slice(0);
}
/* c8 ignore stop */

const asSTRING = (dv, length, offset) => {
  const string = asUTF16Chars(dv, offset, length);
  return string.length ? parse(string) : void 0;
};

const asVIEW = (dv, length, offset) => {
  const byteOffset = dv.getUint32(offset, true);
  const vlength = dv.getUint32(offset + 4, true);
  offset += 8;
  const name = asUTF16Chars(dv, offset, length);
  offset += length * 2;
  const buffer = asBUFFER(dv, dv.getUint32(offset + 1, true), offset + 5);
  const args = [buffer, byteOffset];
  if (vlength) args.push(vlength);
  return new globalThis[name](...args);
};

export const decode = (buffer, options) => {
  const dv = options?.dataView || new DataView(buffer, options?.byteOffset || 0);
  const type = dv.getUint8(0);
  switch (type) {
    case BUFFER: return asBUFFER(dv, dv.getUint32(1, true), 5);
    case VIEW: return asVIEW(dv, dv.getUint32(1, true), 5);
    case STRING: return asSTRING(dv, dv.getUint32(1, true), 5);
    case DIRECT: return [DIRECT, options.direct(asDIRECT(dv, dv.getUint32(1, true), 5))];
    // DIRECT should never travel as such if no `direct` option is provided
    // {
    //   const indirect = !options?.direct;
    //   const length = dv.getUint32(1, true);
    //   const result = indirect ? asSTRING(dv, length, 5) : asDIRECT(dv, length, 5);
    //   return [DIRECT, indirect ? result : options.direct(result)];
    // }
    default: return [type, dv.getInt32(1, true)];
  }
};

export const decoder = options => (_, buffer) => decode(buffer, options);

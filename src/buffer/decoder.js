import {
  DIRECT,
  BUFFER,
  STRING,
  VIEW,
  ERROR,
} from '../types.js';

import { defineProperty, identity } from '../utils/index.js';
import { arrayBuffer } from '../utils/typed.js';
import canDecode from '../utils/sab-decoder.js';

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

// use zero-copy fast path when possible (NodeJS as example)
let asDIRECT = (dv, length, offset) => new Uint8Array(dv.buffer, offset, length);

/* c8 ignore start */
if (!canDecode) {
  const direct = asDIRECT;
  asDIRECT = (dv, length, offset) => direct(dv, length, offset).slice(0);
}
/* c8 ignore stop */

const asERROR = (dv, length, offset) => {
  const string = asUTF16Chars(dv, offset, length);
  const { message, name, stack } = parse(string);
  return defineProperty(new globalThis[name](message), 'stack', { value: stack });
};

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

const dvDecoder = (dv, direct = identity) => {
  const type = dv.getUint8(0);
  switch (type) {
    case BUFFER: return asBUFFER(dv, dv.getUint32(1, true), 5);
    case VIEW: return asVIEW(dv, dv.getUint32(1, true), 5);
    case STRING: return asSTRING(dv, dv.getUint32(1, true), 5);
    case DIRECT: return [DIRECT, direct(asDIRECT(dv, dv.getUint32(1, true), 5))];
    case ERROR: return asERROR(dv, dv.getUint32(1, true), 5);
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

export const decode = (buffer, options) => dvDecoder(
  options?.dataView || new DataView(buffer, options?.byteOffset || 0),
  options?.direct
);

/* c8 ignore start */
export const decoder = (options = {}) => (
  'dataView' in options ?
    //@ts-ignore
    () => dvDecoder(options.dataView, options.direct) :
    (_, buffer) => decode(buffer, options)
);
/* c8 ignore stop */

import {
  DIRECT,
  BUFFER,
  STRING,
  VIEW,
} from '../types.js';

import { arrayBuffer } from '../utils/typed.js';

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

const asDIRECT = (dv, length, offset) => {
  const view = new Uint8Array(length);
  view.set(new Uint8Array(dv.buffer, offset, length));
  return view;
};

const asSTRING = (dv, length, offset) => {
  const string = asUTF16Chars(dv, offset, length);
  return string.length ? parse(string) : void 0;
};

const asVIEW = (dv, length, offset) => {
  const byteOffset = dv.getUint32(offset, true);
  const byteLength = dv.getUint32(offset + 4, true);
  offset += 8;
  const name = asUTF16Chars(dv, offset, length);
  offset += length * 2;
  const buffer = asBUFFER(dv, dv.getUint32(offset + 1, true), offset + 5);
  const args = [buffer, byteOffset];
  if (byteLength) args.push(byteLength);
  return new globalThis[name](...args);
};

export const decode = (buffer, options) => {
  const dv = options?.dataView || new DataView(buffer, options?.byteOffset || 0);
  const type = dv.getUint8(0);
  switch (type) {
    case BUFFER: return asBUFFER(dv, dv.getUint32(1, true), 5);
    case VIEW: return asVIEW(dv, dv.getUint32(1, true), 5);
    case STRING: return asSTRING(dv, dv.getUint32(1, true), 5);
    case DIRECT: {
      const direct = options?.direct;
      const length = dv.getUint32(1, true);
      return [
        DIRECT,
        direct ?
          direct.call(options, asDIRECT(dv, length, 5)) :
          asSTRING(dv, length, 5)
      ];
    }
    default: {
      return [type, dv.getInt32(1, true)];
    }
  }
};

export const decoder = options => (_, buffer) => decode(buffer, options);

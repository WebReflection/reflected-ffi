import {
  DIRECT,
  REMOTE,
  BUFFER,
  STRING,
  VIEW,
} from '../types.js';

import { isArray } from '../utils/index.js';

const { stringify } = JSON;

const resize = (buffer, size) => {
  if (buffer.byteLength < size) {
    /* c8 ignore start */
    (buffer.grow || buffer.resize).call(buffer, size);
    /* c8 ignore stop */
  }
};

const init = (type, buffer, length, size, offset) => {
  resize(buffer, size + offset + 5);
  const dv = new DataView(buffer, offset);
  dv.setUint8(0, type);
  dv.setUint32(1, length, true);
  return dv;
};

const asUTF16Chars = (dv, value, start, end) => {
  for (let i = 0; i < end; i++) {
    dv.setUint16(start, value.charCodeAt(i), true);
    start += 2;
  }
};

const asBUFFER = ([value, maxByteLength], buffer, offset) => {
  const length = value.length;
  const dv = init(BUFFER, buffer, length, length + 4, offset);
  dv.setUint32(5, maxByteLength, true);
  new Uint8Array(buffer, offset + 9, length).set(value);
  return length + 9;
};

const asDIRECT = (value, buffer, offset) => {
  const length = value.length;
  init(DIRECT, buffer, length, length, offset);
  new Uint8Array(buffer, offset + 5, length).set(value);
  return length + 5;
};

const asSTRING = (value, buffer, offset) => {
  const string = stringify(value) || '';
  const length = string.length;
  const double = length * 2;
  const dv = init(STRING, buffer, length, double, offset);
  if (length) asUTF16Chars(dv, string, 5, length);
  return double + 5;
};

const asVALUE = (direct, value, buffer, byteOffset) => (
  direct ?
    asDIRECT(direct(value), buffer, byteOffset) :
    asSTRING(value, buffer, byteOffset)
);

const asVIEW = ([name, args, byteOffset, length], buffer, offset) => {
  const nlength = name.length;
  const utf16length = nlength * 2;
  const dv = init(VIEW, buffer, nlength, utf16length + 8, offset);
  dv.setUint32(5, byteOffset, true);
  dv.setUint32(9, length, true);
  asUTF16Chars(dv, name, 13, nlength);
  offset += 13 + utf16length;
  return offset + asBUFFER(args, buffer, offset);
};

export const encode = (value, buffer, options) => {
  const byteOffset = options?.byteOffset || 0;
  if (isArray(value)) {
    const [t, v] = value;
    switch (t) {
      case BUFFER: return asBUFFER(v, buffer, byteOffset);
      case VIEW: return asVIEW(v, buffer, byteOffset);
      case DIRECT: return asVALUE(options?.direct, v, buffer, byteOffset);
      default: if (t & REMOTE) {
        resize(buffer, byteOffset + 5);
        const dv = new DataView(buffer, byteOffset);
        dv.setUint8(0, t);
        dv.setInt32(1, v, true);
        return 5;
      }
    }
  }
  return asVALUE(options?.direct, value, buffer, byteOffset);
};

export const encoder = options => (value, buffer) => encode(value, buffer, options);

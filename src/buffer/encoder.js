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
  if (buffer.byteLength < size)
    (buffer.grow || buffer.resize).call(buffer, size);
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
  return length;
};

const asDIRECT = (value, buffer, offset) => {
  const length = value.length;
  init(DIRECT, buffer, length, length, offset);
  new Uint8Array(buffer, offset + 5, length).set(value);
  return length;
};

const asSTRING = (value, buffer, offset) => {
  const string = stringify(value) || '';
  const length = string.length;
  const dv = init(STRING, buffer, length, length * 2, offset);
  if (length) asUTF16Chars(dv, string, 5, length);
  return length;
};

const asVIEW = ([name, args, byteOffset, byteLength], buffer, offset) => {
  const nlength = name.length;
  const utf16length = nlength * 2;
  const dv = init(VIEW, buffer, nlength, utf16length + 8, offset);
  dv.setUint32(5, byteOffset, true);
  dv.setUint32(9, byteLength, true);
  asUTF16Chars(dv, name, 13, nlength);
  return utf16length + asBUFFER(args, buffer, offset + 13 + utf16length);
};

export const encode = (value, buffer, options) => {
  const byteOffset = options?.byteOffset || 0;
  if (isArray(value)) {
    const [t, v] = value;
    switch (t) {
      case BUFFER: return asBUFFER(v, buffer, byteOffset);
      case VIEW: return asVIEW(v, buffer, byteOffset);
      case DIRECT: return options?.direct ?
        asDIRECT(options.direct(v), buffer, byteOffset) :
        asSTRING(v, buffer, byteOffset);
      default: if (t & REMOTE) {
        resize(buffer, byteOffset + 5);
        const dv = new DataView(buffer, byteOffset);
        dv.setUint8(0, t);
        dv.setInt32(1, v, true);
        return 5;
      }
    }
  }
  return asSTRING(value, buffer, byteOffset);
};

export const encoder = options => (value, buffer) => encode(value, buffer, options);

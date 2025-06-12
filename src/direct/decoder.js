import {
  FALSE,
  TRUE,

  NULL,

  NUMBER,
  NAN,
  INFINITY,
  N_INFINITY,
  ZERO,
  N_ZERO,

  BIGINT,
  STRING,
  SYMBOL,

  ARRAY,
  BUFFER,
  DATE,
  ERROR,
  MAP,
  OBJECT,
  REGEXP,
  SET,
  VIEW,

  RECURSION
} from './types.js';

import { fromSymbol } from '../utils/symbol.js';
import { decoder } from '../utils/text.js';

const { defineProperty } = Object;

const buffer = new ArrayBuffer(8);
const f64a = new Float64Array(buffer);
const u32a = new Uint32Array(buffer);
const b64a = new BigInt64Array(buffer);
const u8a = new Uint8Array(buffer);

const $ = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

const number = (input, start, end) => {
  for (let i = 0; start < end; start++)
    u8a[i++] = input[start];
};

const size = (input, i) => {
  for (let j = 0; j < 4; j++) u8a[j] = input[i++];
  return u32a[0];
};

const decode = (input, cache) => {
  switch (input[i++]) {
    case OBJECT: {
      const object = $(cache, i - 1, {});
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        object[decode(input, cache)] = decode(input, cache);
      return object;
    }
    case ARRAY: {
      const array = $(cache, i - 1, []);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        array.push(decode(input, cache));
      return array;
    }
    case VIEW: {
      const index = i - 1;
      const name = decode(input, cache);
      return $(cache, index, new globalThis[name](decode(input, cache)));
    }
    case BUFFER: {
      const index = i - 1;
      const length = size(input, i);
      return $(cache, index, input.slice(i += 4, i += length).buffer);
    }
    case STRING: {
      const index = i - 1;
      const length = size(input, i);
      return $(cache, index, decoder.decode(input.subarray(i += 4, i += length)));
    }
    case NUMBER: {
      number(input, i, i += 8);
      return f64a[0];
    }
    case DATE: {
      return $(cache, i - 1, new Date(decode(input, cache)));
    }
    case MAP: {
      const map = $(cache, i - 1, new Map);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        map.set(decode(input, cache), decode(input, cache));
      return map;
    }
    case SET: {
      const set = $(cache, i - 1, new Set);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        set.add(decode(input, cache));
      return set;
    }
    case ERROR: {
      const name = decode(input, cache);
      const message = decode(input, cache);
      const stack = decode(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return $(cache, i - 1, defineProperty(error, 'stack', { value: stack }));
    }
    case REGEXP: {
      const source = decode(input, cache);
      const flags = decode(input, cache);
      return $(cache, i - 1, new RegExp(source, flags));
    }
    case FALSE: return false;
    case TRUE: return true;
    case NAN: return NaN;
    case INFINITY: return Infinity;
    case N_INFINITY: return -Infinity;
    case ZERO: return 0;
    case N_ZERO: return -0;
    case NULL: return null;
    case BIGINT: {
      number(input, i, i += 8);
      return b64a[0];
    }
    case SYMBOL: return fromSymbol(decode(input, cache));
    case RECURSION: {
      const index = size(input, i);
      i += 4;
      return cache.get(index);
    }
    // this covers functions too
    default: return undefined;
  }
};

let i = 0;

/**
 * @param {Uint8Array} value
 * @returns {any}
 */
export default value => {
  i = 0;
  return decode(value, new Map);
};

//@ts-check

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
  BIGUINT,
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

import { defineProperty } from '../utils/index.js';
import { fromSymbol } from '../utils/symbol.js';
import { decoder as textDecoder } from '../utils/text.js';
import canDecode from '../utils/sab-decoder.js';
import { dv, u8a8 } from './views.js';

/** @typedef {Map<number, any>} Cache */

/**
 * @param {Cache} cache
 * @param {number} index
 * @param {any} value
 * @returns {any}
 */
const $ = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

/**
 * @param {Uint8Array} input
 * @param {number} start
 * @param {number} end
 */
const number = (input, start, end) => {
  for (let i = 0; start < end; start++)
    u8a8[i++] = input[start];
};

/**
 * @param {Uint8Array} input
 * @param {number} i
 * @returns {number}
 */
const size = (input, i) => {
  for (let j = 0; j < 4; j++) u8a8[j] = input[i++];
  return dv.getUint32(0, true);
};

/* c8 ignore start */
const subarray = /** @type {(input:Uint8Array,start:number,end:number)=>Uint8Array} */(
  canDecode ?
    (input, start, end) => input.subarray(start, end) :
    (input, start, end) => input.slice(start, end)
);
/* c8 ignore stop */

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate = (input, cache) => {
  switch (input[i++]) {
    case OBJECT: {
      const object = $(cache, i - 1, {});
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        object[deflate(input, cache)] = deflate(input, cache);
      return object;
    }
    case ARRAY: {
      const array = $(cache, i - 1, []);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        array.push(deflate(input, cache));
      return array;
    }
    case VIEW: {
      const index = i - 1;
      const name = deflate(input, cache);
      return $(cache, index, new globalThis[name](deflate(input, cache)));
    }
    case BUFFER: {
      const index = i - 1;
      const length = size(input, i);
      return $(cache, index, input.slice(i += 4, i += length).buffer);
    }
    case STRING: {
      const index = i - 1;
      const length = size(input, i);
      return $(cache, index, textDecoder.decode(subarray(input, i += 4, i += length)));
    }
    case NUMBER: {
      number(input, i, i += 8);
      return dv.getFloat64(0, true);
    }
    case DATE: {
      return $(cache, i - 1, new Date(deflate(input, cache)));
    }
    case MAP: {
      const map = $(cache, i - 1, new Map);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        map.set(deflate(input, cache), deflate(input, cache));
      return map;
    }
    case SET: {
      const set = $(cache, i - 1, new Set);
      const length = size(input, i);
      i += 4;
      for (let j = 0; j < length; j++)
        set.add(deflate(input, cache));
      return set;
    }
    case ERROR: {
      const name = deflate(input, cache);
      const message = deflate(input, cache);
      const stack = deflate(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return $(cache, i - 1, defineProperty(error, 'stack', { value: stack }));
    }
    case REGEXP: {
      const source = deflate(input, cache);
      const flags = deflate(input, cache);
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
      return dv.getBigInt64(0, true);
    }
    case BIGUINT: {
      number(input, i, i += 8);
      return dv.getBigUint64(0, true);
    }
    case SYMBOL: return fromSymbol(deflate(input, cache));
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
export const decode = value => {
  i = 0;
  return deflate(value, new Map);
};

/**
 * @param {{ byteOffset?: number }} [options]
 * @returns {(length: number, buffer: SharedArrayBuffer) => any}
 */
export const decoder = ({ byteOffset = 0 } = {}) => (length, buffer) => decode(
  new Uint8Array(buffer, byteOffset, length)
);

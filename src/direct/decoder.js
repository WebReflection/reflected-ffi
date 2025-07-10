//@ts-check

import {
  FALSE,
  TRUE,

  NULL,

  NUMBER,
  UI8,
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

  IMAGE_DATA,

  RECURSION
} from './types.js';

import { ImageData } from './web.js';

import { decoder as textDecoder } from '../utils/text.js';
import { defineProperty } from '../utils/index.js';
import { fromSymbol } from '../utils/symbol.js';
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
 */
const number = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  u8a8[4] = input[i++];
  u8a8[5] = input[i++];
  u8a8[6] = input[i++];
  u8a8[7] = input[i++];
};

/**
 * @param {Uint8Array} input
 * @returns {number}
 */
const size = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  return dv.getUint32(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate = (input, cache) => {
  switch (input[i++]) {
    case NUMBER: {
      number(input);
      return dv.getFloat64(0, true);
    }
    case UI8: return input[i++];
    case OBJECT: {
      const object = $(cache, i - 1, {});
      for (let j = 0, length = size(input); j < length; j++)
        object[deflate(input, cache)] = deflate(input, cache);
      return object;
    }
    case ARRAY: {
      const array = $(cache, i - 1, []);
      for (let j = 0, length = size(input); j < length; j++)
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
      const length = size(input);
      return $(cache, index, input.slice(i, i += length).buffer);
    }
    case STRING: {
      const index = i - 1;
      const length = size(input);
      // this could be a subarray but it's not supported on the Web and
      // it wouldn't work with arrays instead of typed arrays.
      return $(cache, index, textDecoder.decode(input.slice(i, i += length)));
    }
    case DATE: {
      return $(cache, i - 1, new Date(deflate(input, cache)));
    }
    case MAP: {
      const map = $(cache, i - 1, new Map);
      for (let j = 0, length = size(input); j < length; j++)
        map.set(deflate(input, cache), deflate(input, cache));
      return map;
    }
    case SET: {
      const set = $(cache, i - 1, new Set);
      for (let j = 0, length = size(input); j < length; j++)
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
    /* c8 ignore start */
    case IMAGE_DATA: {
      const data = deflate(input, cache);
      const width = deflate(input, cache);
      const height = deflate(input, cache);
      const colorSpace = deflate(input, cache);
      const pixelFormat = deflate(input, cache);
      const settings = { colorSpace, pixelFormat };
      return $(cache, i - 1, new ImageData(data, width, height, settings));
    }
    /* c8 ignore stop */
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
    case BIGINT: return (number(input), dv.getBigInt64(0, true));
    case BIGUINT: return (number(input), dv.getBigUint64(0, true));
    case SYMBOL: return fromSymbol(deflate(input, cache));
    case RECURSION: return cache.get(size(input));
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
 * @returns {(length: number, buffer: ArrayBufferLike) => any}
 */
export const decoder = ({ byteOffset = 0 } = {}) => (length, buffer) => decode(
  new Uint8Array(buffer, byteOffset, length)
);

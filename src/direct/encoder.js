//@ts-check

import {
  FALSE,
  TRUE,

  UNDEFINED,
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

  RECURSION,
} from './types.js';

import { ImageData } from './web.js';

import Stack from './array.js';
import { isArray, isView, push } from '../utils/index.js';
import { encoder as textEncoder } from '../utils/text.js';
import { toSymbol } from '../utils/symbol.js';
import { dv, u8a8 } from './views.js';
import { toTag } from '../utils/global.js';

/** @typedef {Map<number, number[]>} Cache */

const { isNaN, isFinite, isInteger } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv.setUint32(0, output.length, true);
    cache.set(input, [u8a8[0], u8a8[1], u8a8[2], u8a8[3]]);
  }
  else
    output.push(RECURSION, value[0], value[1], value[2], value[3]);
  return unknown;
};

/**
 * @param {number[]|Stack} output
 * @param {number} type
 * @param {number} length
 */
const set = (output, type, length) => {
  dv.setUint32(0, length, true);
  output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3]);
};

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 */
const inflate = (input, output, cache) => {
  switch (typeof input) {
    case 'number': {
      if (input && isFinite(input)) {
        if (isInteger(input) && input < 256 && -1 < input)
          output.push(UI8, input);
        else {
          dv.setFloat64(0, input, true);
          output.push(NUMBER, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
        }
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    }
    case 'object': {
      switch (true) {
        case input === null:
          output.push(NULL);
          break;
        case !process(input, output, cache): break;
        case isArray(input): {
          const length = input.length;
          set(output, ARRAY, length);
          for (let i = 0; i < length; i++)
            inflate(input[i], output, cache);
          break;
        }
        case isView(input): {
          output.push(VIEW);
          inflate(toTag(input), output, cache);
          input = input.buffer;
          if (!process(input, output, cache)) break;
          // fallthrough
        }
        case input instanceof ArrayBuffer: {
          const ui8a = new Uint8Array(input);
          set(output, BUFFER, ui8a.length);
          //@ts-ignore
          pushView(output, ui8a);
          break;
        }
        case input instanceof Date:
          output.push(DATE);
          inflate(input.getTime(), output, cache);
          break;
        case input instanceof Map: {
          set(output, MAP, input.size);
          for (const [key, value] of input) {
            inflate(key, output, cache);
            inflate(value, output, cache);
          }
          break;
        }
        case input instanceof Set: {
          set(output, SET, input.size);
          for (const value of input)
            inflate(value, output, cache);
          break;
        }
        case input instanceof Error:
          output.push(ERROR);
          inflate(input.name, output, cache);
          inflate(input.message, output, cache);
          inflate(input.stack, output, cache);
          break;
        /* c8 ignore start */
        case input instanceof ImageData:
          output.push(IMAGE_DATA);
          inflate(input.data, output, cache);
          inflate(input.width, output, cache);
          inflate(input.height, output, cache);
          inflate(input.colorSpace, output, cache);
          //@ts-ignore
          inflate(input.pixelFormat, output, cache);
          break;
        /* c8 ignore stop */
        case input instanceof RegExp:
          output.push(REGEXP);
          inflate(input.source, output, cache);
          inflate(input.flags, output, cache);
          break;
        default: {
          if ('toJSON' in input) {
            const json = input.toJSON();
            inflate(json === input ? null : json, output, cache);
          }
          else {
            const keys = ownKeys(input);
            const length = keys.length;
            set(output, OBJECT, length);
            for (let i = 0; i < length; i++) {
              const key = keys[i];
              inflate(key, output, cache);
              inflate(input[key], output, cache);
            }
          }
          break;
        }
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = textEncoder.encode(input);
        set(output, STRING, encoded.length);
        //@ts-ignore
        pushView(output, encoded);
      }
      break;
    }
    case 'boolean': {
      output.push(input ? TRUE : FALSE);
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      inflate(toSymbol(input), output, cache);
      break;
    }
    case 'bigint': {
      let type = BIGINT;
      if (9223372036854775807n < input) {
        dv.setBigUint64(0, input, true);
        type = BIGUINT;
      }
      else dv.setBigInt64(0, input, true);
      output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
      break;
    }
    // this covers functions too
    default: {
      output.push(UNDEFINED);
      break;
    }
  }
};

/** @type {typeof push|typeof Stack.push} */
let pushView = push;

/**
 * @param {any} value
 * @returns {number[]}
 */
export const encode = value => {
  const output = [];
  pushView = push;
  inflate(value, output, new Map);
  return output;
};

/**
 * @param {{ byteOffset?: number, Array?: typeof Stack }} [options]
 * @returns {(value: any, buffer: ArrayBufferLike) => number}
 */
export const encoder = ({ byteOffset = 0, Array = Stack } = {}) => (value, buffer) => {
  const output = new Array(buffer, byteOffset);
  pushView = Array.push;
  inflate(value, output, new Map);
  const length = output.length;
  output.sync(true);
  return length;
};

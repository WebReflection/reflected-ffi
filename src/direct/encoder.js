//@ts-check

import {
  FALSE,
  TRUE,

  UNDEFINED,
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

import { toSymbol } from '../utils/symbol.js';

import { isArray, isView, push } from '../utils/index.js';
import { toTag } from '../utils/global.js';
import { encoder as textEncoder } from '../utils/text.js';
import { dv, u8a8, u8a4 } from './views.js';

/** @typedef {Map<number, number[]>} Cache */

const { isNaN, isFinite } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

/**
 * @param {any} input
 * @param {number[]} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv.setUint32(0, output.length, true);
    cache.set(input, [...u8a4]);
  }
  else
    output.push(RECURSION, ...value);
  return unknown;
};

/**
 * @param {number[]} output
 * @param {number} type
 * @param {number} length
 */
const set = (output, type, length) => {
  dv.setUint32(0, length, true);
  output.push(type, ...u8a4);
};

/**
 * @param {any} input
 * @param {number[]} output
 * @param {Cache} cache
 */
const inflate = (input, output, cache) => {
  switch (typeof input) {
    case 'object': {
      if (input === null) {
        output.push(NULL);
        break;
      }
      else if (!process(input, output, cache)) break;
      else if (isArray(input)) {
        const length = input.length;
        set(output, ARRAY, length);
        for (let i = 0; i < length; i++)
          inflate(input[i], output, cache);
      }
      else if (isView(input)) {
        output.push(VIEW);
        inflate(toTag(input), output, cache);
        inflate(input.buffer, output, cache);
      }
      else if (input instanceof ArrayBuffer) {
        const ui8a = new Uint8Array(input);
        set(output, BUFFER, ui8a.length);
        push(output, ui8a);
      }
      else if (input instanceof Date) {
        output.push(DATE);
        inflate(input.getTime(), output, cache);
      }
      else if (input instanceof Map) {
        set(output, MAP, input.size);
        for (const [key, value] of input) {
          inflate(key, output, cache);
          inflate(value, output, cache);
        }
      }
      else if (input instanceof Set) {
        set(output, SET, input.size);
        for (const value of input)
          inflate(value, output, cache);
      }
      else if (input instanceof Error) {
        output.push(ERROR);
        inflate(input.name, output, cache);
        inflate(input.message, output, cache);
        inflate(input.stack, output, cache);
      }
      else if (input instanceof RegExp) {
        output.push(REGEXP);
        inflate(input.source, output, cache);
        inflate(input.flags, output, cache);
      }
      else {
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
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = textEncoder.encode(input);
        set(output, STRING, encoded.length);
        push(output, encoded);
      }
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      inflate(toSymbol(input), output, cache);
      break;
    }
    case 'number':
      if (input && isFinite(input)) {
        dv.setFloat64(0, input, true);
        output.push(NUMBER, ...u8a8);
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    case 'boolean':
      output.push(input ? TRUE : FALSE);
      break;
    case 'bigint': {
      dv.setBigInt64(0, input, true);
      output.push(BIGINT, ...u8a8);
      break;
    }
    // this covers functions too
    default:
      output.push(UNDEFINED);
      break;
  }
};

/**
 * @param {any} value
 * @returns {number[]}
 */
export const encode = value => {
  const output = [];
  inflate(value, output,  new Map);
  return output;
};

/**
 * @param {{ byteOffset?: number }} [options]
 * @returns {(value: any, buffer: SharedArrayBuffer) => number}
 */
export const encoder = ({ byteOffset = 0 } = {}) => (value, buffer) => {
  const output = encode(value);
  const length = output.length;
  const size = length + byteOffset;
  if (buffer.byteLength < size) {
    //@ts-ignore
    buffer.grow(size);
  }
  new Uint8Array(buffer, byteOffset, length).set(output);
  return length;
};

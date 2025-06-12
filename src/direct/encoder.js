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
import { encoder } from '../utils/text.js';

const { isNaN, isFinite } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

const buffer = new ArrayBuffer(8);
const f64a = new Float64Array(buffer);
const u32a = new Uint32Array(buffer);
const b64a = new BigInt64Array(buffer);
const u8a = new Uint8Array(buffer);

const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    u32a[0] = output.length;
    cache.set(input, u8a.slice(0, 4));
  }
  else
    output.push(RECURSION, ...value);
  return unknown;
};

const set = (output, type, length) => {
  u32a[0] = length;
  output.push(type, ...u8a.subarray(0, 4));
};

const encode = (input, output, cache) => {
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
          encode(input[i], output, cache);
      }
      else if (isView(input)) {
        output.push(VIEW);
        encode(toTag(input), output, cache);
        encode(input.buffer, output, cache);
      }
      else if (input instanceof ArrayBuffer) {
        const ui8a = new Uint8Array(input);
        set(output, BUFFER, ui8a.length);
        push(output, ui8a);
      }
      else if (input instanceof Date) {
        output.push(DATE);
        encode(input.toISOString(), output, cache);
      }
      else if (input instanceof Map) {
        set(output, MAP, input.size);
        for (const [key, value] of input) {
          encode(key, output, cache);
          encode(value, output, cache);
        }
      }
      else if (input instanceof Set) {
        set(output, SET, input.size);
        for (const value of input)
          encode(value, output, cache);
      }
      else if (input instanceof Error) {
        output.push(ERROR);
        encode(input.name, output, cache);
        encode(input.message, output, cache);
        encode(input.stack, output, cache);
      }
      else if (input instanceof RegExp) {
        output.push(REGEXP);
        encode(input.source, output, cache);
        encode(input.flags, output, cache);
      }
      else {
        const keys = ownKeys(input);
        const length = keys.length;
        set(output, OBJECT, length);
        for (let i = 0; i < length; i++) {
          const key = keys[i];
          encode(key, output, cache);
          encode(input[key], output, cache);
        }
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = encoder.encode(input);
        set(output, STRING, encoded.length);
        push(output, encoded);
      }
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      encode(toSymbol(input), output, cache);
      break;
    }
    case 'number':
      if (input && isFinite(input)) {
        f64a[0] = input;
        output.push(NUMBER, ...u8a);
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    case 'boolean':
      output.push(input ? TRUE : FALSE);
      break;
    case 'bigint': {
      b64a[0] = input;
      output.push(BIGINT, ...u8a);
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
export default value => {
  const output = [];
  encode(value, output, new Map);
  return output;
};

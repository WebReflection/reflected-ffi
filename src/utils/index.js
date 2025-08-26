import {
  DIRECT,
  SYMBOL,
} from '../types.js';

import { fromSymbol, toSymbol } from './symbol.js';

export const defineProperty = Object.defineProperty;

export const assign = Object.assign;

export const fromArray = Array.from;

export const isArray = Array.isArray;

export const isView = ArrayBuffer.isView;

/**
 * A type/value pair.
 * @typedef {[number, any]} TypeValue
 */

/**
 * Create a type/value pair.
 * @param {number} type
 * @param {any} value
 * @returns {TypeValue}
 */
export const tv = (type, value) => [type, value];

export const identity = value => value;

export const array = [];
export const object = {};

/* c8 ignore start */
export const callback = function () {};
/* c8 ignore stop */

/**
 * Create a function that loops through an array and applies a function to each value.
 * @param {(value:any, cache?:Map<any, any>) => any} asValue
 * @returns
 */
export const loopValues = asValue => (
  /**
   * Loop through an array and apply a function to each value.
   * @param {any[]} arr
   * @param {Map} [cache]
   * @returns
   */
  (arr, cache = new Map) => {
    for (let i = 0, length = arr.length; i < length; i++)
      arr[i] = asValue(arr[i], cache);
    return arr;
  }
);

/**
 * Extract the value from a pair of type and value.
 * @param {TypeValue} pair
 * @returns {string|symbol}
 */
export const fromKey = ([type, value]) => type === DIRECT ? value : fromSymbol(value);

/**
 * Associate a key with an optionally transformed value.
 * @param {string|symbol} value
 * @returns {TypeValue}
 */
export const toKey = value => typeof value === 'string' ?
  tv(DIRECT, value) : tv(SYMBOL, toSymbol(value))
;

const MAX_ARGS = 0x7FFF;

/**
 * @param {number[]} output
 * @param {Uint8Array} value 
 */
export const push = (output, value) => {
  for (let $ = output.push, i = 0, length = value.length; i < length; i += MAX_ARGS)
    $.apply(output, value.subarray(i, i + MAX_ARGS));
};

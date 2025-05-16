import {
  DIRECT,
  SYMBOL,
} from './types.js';

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
export const _$ = (type, value) => [type, value];

export const identity = value => value;

export const object = {};

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
  _$(DIRECT, value) : _$(SYMBOL, toSymbol(value))
;

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
export const fromSymbol = name => name.startsWith('Symbol.') ?
  Symbol[name.slice(name.indexOf('.') + 1)] :
  Symbol.for(name)
;

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
export const toSymbol = value => {
  const name = String(value).slice(7, -1);
  return name.startsWith('Symbol.') || Symbol.keyFor(value) ? name : '';
};

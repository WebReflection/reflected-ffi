import {
  DIRECT,
  SYMBOL,
} from './types.js';

export const isArray = Array.isArray;

export const _$ = (_, $) => [_, $];

export const identity = value => value;

export const loopValues = asValue => (
  ($, cache = new Map) => {
    for (let i = 0, length = $.length; i < length; i++)
      $[i] = asValue($[i], cache);
    return $;
  }
);

export const fromKey = ([_, $]) => _ === DIRECT ? $ : fromSymbol($);

export const toKey = prop => typeof prop === 'string' ?
  _$(DIRECT, prop) : _$(SYMBOL, toSymbol(prop))
;

export const fromSymbol = name => name.startsWith('Symbol.') ?
  Symbol[name.slice(name.indexOf('.') + 1)] :
  Symbol.for(name)
;

export const toSymbol = value => {
  const name = String(value).slice(7, -1);
  return name.startsWith('Symbol.') || Symbol.keyFor(value) ? name : '';
};

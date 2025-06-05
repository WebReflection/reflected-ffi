const symbols = new Set(Reflect.ownKeys(Symbol).map(name => Symbol[name]));

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
export const fromSymbol = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
export const toSymbol = value => {
  let description = value.description;
  if (symbols.has(value)) return `@${description.slice(7)}`;
  if (Symbol.keyFor(value) !== void 0) return `#${description}`;
  return description === void 0 ? '?' : `!${description}`;
};

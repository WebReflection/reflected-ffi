import query from './query.js';

/**
 * Parses each given path and returns each value at the given target.
 * @param {any} target
 * @param  {...(string|symbol)[]} keys
 * @returns {any[]}
 */
export default (target, ...keys) => keys.map(asResult, target);

function asResult(key) {
  return typeof key === 'string' ? query(this, key) : this[key];
}

/**
 * Invokes the given callback with the given arguments.
 * This utility is here only to simplify code portability.
 * @param {Function} callback
 * @param  {...any} args
 * @returns {any}
 */
export default (callback, ...args) => callback.apply(null, args);

const brackets = /\[('|")?(.+?)\1\]/g;

const keys = (target, key) => target?.[key];

/**
 * Parses the given path and returns the value at the given target.
 * @param {any} target
 * @param {string} path
 * @returns {any}
 */
export default (target, path) => path.replace(brackets, '.$2').split('.').reduce(keys, target);

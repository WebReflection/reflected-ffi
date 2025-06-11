// (c) https://github.com/WebReflection/to-json-callback
// brought in here to avoid a dependency for quick testing

/**
 * @param {Function} [callback=this]
 * @returns {string}
 */
export default function (callback = this) {
  return String(callback).replace(
    /^(async\s*)?(\bfunction\b)?(.*?)\(/,
    (_, isAsync, fn, name) => (
      name && !fn ?
        `${isAsync || ""}function ${name}(` :
        _
    ),
  );
};

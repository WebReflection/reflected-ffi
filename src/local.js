import {
  DIRECT,
  OBJECT,
  ARRAY,
  FUNCTION,
  REMOTE,
  SYMBOL,
  BIGINT,
  VIEW,

  REMOTE_OBJECT,
  REMOTE_ARRAY,
  REMOTE_FUNCTION,
} from './types.js';

import {
  isArray,
  isView,
  fromKey,
  toKey,
  toSymbol,
  identity,
  loopValues,
  _$,
} from './utils.js';

import heap from './heap.js';

const toArray = view => {
  const arr = [];
  for (let i = 0, length = view.length; i < length; i++)
    arr[i] = view[i];
  return arr;
};

const toTag = (ref, name = ref[Symbol.toStringTag]) =>
  name in globalThis ? name : toTag(Object.getPrototypeOf(ref));

/**
 * @typedef {Object} LocalOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [remote=identity] The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
 * @property {Function} [module] The function used to import modules when remote asks to `import(...)` something.
 */

/**
 * @param {LocalOptions} options
 * @returns
 */
export default ({
  reflect = identity,
  transform = identity,
  remote = identity,
  module = name => import(name),
} = {}) => {
  // received values arrive via postMessage so are compatible
  // with the structured clone algorithm
  const fromValue = (_$, cache = new Map) => {
    if (!isArray(_$)) return _$;
    const [_, $] = _$;
    if (_ === OBJECT) {
      if ($ === null) return globalThis;
      let cached = cache.get(_$);
      if (!cached) {
        cached = $;
        cache.set(_$, $);
        for (const k in $) $[k] = fromValue($[k], cache);
      }
      return cached;
    }
    if (_ === ARRAY) {
      return cache.get(_$) || (
        cache.set(_$, $),
        fromValues($, cache)
      );
    }
    if (_ === FUNCTION) {
      let fn = weakRefs.get($), wr = fn?.deref();
      if (!fn) {
        if (wr) fr.unregister(wr);
        fn = function (...args) {
          remote.apply(this, args);
          // values reflected asynchronously are not passed stringified
          // because it makes no sense to use Atomics and SharedArrayBuffer
          // to transfer these ... yet these must reflect the current state
          // on this local side of affairs.
          for (let i = 0, length = args.length; i < length; i++)
            args[i] = toValue(args[i]);
          return reflect('apply', $, toValue(this), args).then(fromValue);
        };
        wr = new WeakRef(fn);
        weakRefs.set($, wr);
        fr.register(fn, $, wr);
      }
      return fn;
    }
    return (_ & REMOTE) ? ref($) : $;
  };

  // OBJECT, DIRECT, VIEW, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  /**
   * Converts values into TypeValue pairs when these
   * are not JSON compatible (symbol, bigint) or
   * local (functions, arrays, objects, globalThis).
   * @param {any} value the current value
   * @returns {any} the value as is or its TypeValue counterpart
   */
  const toValue = value => {
    switch (typeof value) {
      case 'object': {
        if (value === null) break;
        if (value === globalThis) return globalTarget;
        const $ = transform(value);
        return (hasDirect && direct.has($)) ?
          _$(DIRECT, $) : (
          isView($) ?
            _$(VIEW, [toTag($), toArray($)]) :
            _$(isArray($) ? REMOTE_ARRAY : REMOTE_OBJECT, id($))
        );
      }
      case 'function': return _$(REMOTE_FUNCTION, id(value));
      case 'symbol': return _$(SYMBOL, toSymbol(value));
      case 'bigint': return _$(BIGINT, value.toString());
    }
    return value;
  };

  const fromValues = loopValues(fromValue);
  const toKeys = loopValues(toKey);

  const { clear, id, ref, unref } = heap();

  const weakRefs = new Map;
  const globalTarget = _$(OBJECT, null);
  const fr = new FinalizationRegistry($ => {
    weakRefs.delete($);
    reflect('unref', $);
  });

  let hasDirect = false, direct;

  return {
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (!hasDirect) {
        hasDirect = true;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {string} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method, uid, ...args) => {
      if (method === 'unref') return unref(uid);
      const fn = Reflect[method];
      const isGlobal = uid === null;
      const target = isGlobal ? globalThis : ref(uid);
      // the order is by most common use cases
      if (method === 'get') {
        const key = fromKey(args[0]);
        return toValue(isGlobal && key === 'import' ? module : fn(target, key));
      }
      if (method === 'apply') {
        const map = new Map;
        return toValue(fn(target, fromValue(args[0], map), fromValues(args[1], map)));
      }
      if (method === 'set') return fn(target, fromKey(args[0]), fromValue(args[1]));
      if (method === 'has') return fn(target, fromKey(args[0]));
      if (method === 'ownKeys') return toKeys(fn(target), weakRefs);
      if (method === 'construct') return toValue(fn(target, fromValues(args[0])));
      if (method === 'getOwnPropertyDescriptor') {
        const descriptor = fn(target, fromKey(args[0]));
        if (descriptor) {
          for (const k in descriptor)
            descriptor[k] = toValue(descriptor[k]);
        }
        return descriptor;
      }
      if (method === 'defineProperty') return fn(target, fromKey(args[0]), fromValue(args[1]));
      if (method === 'deleteProperty') return fn(target, fromKey(args[0]));
      if (method === 'getPrototypeOf') return toValue(fn(target));
      if (method === 'setPrototypeOf') return fn(target, fromValue(args[0]));
      return fn(target);
    },

    /**
     * Terminates the local side of the communication,
     * erasing and unregistering all the cached references.
     */
    terminate() {
      for (const wr of weakRefs.values()) fr.unregister(wr);
      weakRefs.clear();
      clear();
    },
  };
};

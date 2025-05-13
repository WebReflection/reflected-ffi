import {
  DIRECT,
  OBJECT,
  ARRAY,
  FUNCTION,
  REMOTE,
  SYMBOL,

  REMOTE_OBJECT,
  REMOTE_ARRAY,
  REMOTE_FUNCTION,
} from './types.js';

import { heap } from './heap.js';

import {
  isArray,
  fromKey,
  fromSymbol,
  toKey,
  toSymbol,
  identity,
  loopValues,
  _$
} from './utils.js';

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
  const fromValue = (_$, cache = new Map) => {
    const [_, $] = _$;
    switch (_) {
      case OBJECT: {
        if ($ === null) return globalThis;
        let cached = cache.get(_$);
        if (!cached) {
          cached = $;
          cache.set(_$, $);
          for (const k in $) $[k] = fromValue($[k], cache);
        }
        return cached;
      }
      case ARRAY: {
        return cache.get(_$) || (
          cache.set(_$, $),
          fromValues($, cache)
        );
      }
      case FUNCTION: {
        let fn = weakRefs.get($), wr = fn?.deref();
        if (!fn) {
          if (wr) fr.unregister(wr);
          fn = function (...args) {
            remote.apply(this, args);
            return reflect('apply', $, toValue(this), args.map(toValue)).then(fromValue);
          };
          wr = new WeakRef(fn);
          weakRefs.set($, wr);
          fr.register(fn, $, wr);
        }
        return fn;
      }
      case SYMBOL: return fromSymbol($);
    }
    return (_ & REMOTE) ? ref($) : $;
  };

  const fromValues = loopValues(fromValue);

  const toKeys = loopValues(toKey);

  const toValue = value => {
    switch (typeof value) {
      case 'object': {
        if (value === null) return _$(DIRECT, value);
        if (value === globalThis) return globalTarget;
        const $ = transform(value);
        return (indirect || !directValue.has($)) ?
          // anything that is not an Array is held as remote object
          // **including** views and anything else that was not
          // explicitly marked as direct
          _$(isArray(value) ? REMOTE_ARRAY : REMOTE_OBJECT, id(value)) :
          _$(DIRECT, $)
        ;
      }
      case 'function': return _$(REMOTE_FUNCTION, id(value));
      case 'symbol': return _$(SYMBOL, toSymbol(value));
    }
    return _$(DIRECT, value);
  };

  const fr = new FinalizationRegistry($ => {
    weakRefs.delete($);
    reflect('unref', $);
  });

  let indirect = true;

  const weakRefs = new Map;
  const directValue = new WeakSet;
  const globalTarget = _$(OBJECT, null);

  const { id, ref, unref } = heap();

  const {
    apply,
    construct,
    defineProperty,
    deleteProperty,
    get,
    getOwnPropertyDescriptor,
    getPrototypeOf,
    has,
    ownKeys,
    set,
    setPrototypeOf,
  } = Reflect;

  return {
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (indirect) indirect = false;
      directValue.add(value);
      return value;
    },

    /**
     * The callback needed to resolve any remote proxy call.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {string} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method, uid, ...args) => {
      const target = uid === null ? globalThis : ref(uid);
      // the `case` order is by common use cases
      switch (method) {
        case 'get': {
          const key = fromKey(args[0]);
          return key === 'import' ?
            _$(REMOTE_FUNCTION, id(module)) :
            toValue(get(target, key))
          ;
        }
        case 'apply': {
          const map = new Map;
          return toValue(apply(target, fromValue(args[0], map), fromValues(args[1], map)));
        }
        case 'set': {
          return set(target, fromKey(args[0]), fromValue(args[1]));
        }
        case 'has': {
          return has(target, fromKey(args[0]));
        }
        case 'ownKeys': {
          return toKeys(ownKeys(target), weakRefs);
        }
        case 'construct': {
          return toValue(construct(target, fromValues(args[0])));
        }
        case 'getOwnPropertyDescriptor': {
          const descriptor = getOwnPropertyDescriptor(target, fromKey(args[0]));
          if (descriptor) {
            const { get, set, value } = descriptor;
            //@ts-ignore
            if (get) descriptor.get = toValue(get);
            //@ts-ignore
            if (set) descriptor.set = toValue(set);
            //@ts-ignore
            if (value) descriptor.value = toValue(value);
          }
          return descriptor;
        }
        case 'getPrototypeOf': {
          return toValue(getPrototypeOf(target));
        }
        case 'defineProperty': {
          return defineProperty(target, fromKey(args[0]), fromValue(args[1]));
        }
        case 'deleteProperty': {
          return deleteProperty(target, fromKey(args[0]));
        }
        case 'setPrototypeOf': {
          return setPrototypeOf(target, fromValue(args[0]));
        }
        case 'isExtensible':
          // fall through
        case 'preventExtensions': {
          return Reflect[method](target);
        }
        case 'unref': {
          return unref(uid);
        }
      }
    }
  };
};

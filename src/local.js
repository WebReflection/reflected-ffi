import DEBUG from './utils/debug.js';

import {
  DIRECT,
  OBJECT,
  ARRAY,
  FUNCTION,
  REMOTE,
  SYMBOL,
  BIGINT,
  VIEW,
  BUFFER,

  REMOTE_OBJECT,
  REMOTE_ARRAY,
  REMOTE_FUNCTION,
} from './types.js';

import {
  fromSymbol,
  toSymbol,
} from './utils/symbol.js';

import {
  toBuffer,
  toView,
} from './utils/typed.js';

import {
  assign,
  isArray,
  isView,
  fromKey,
  toKey,
  identity,
  loopValues,
  object,
  tv,
} from './utils/index.js';

import heap from './utils/heap.js';

/**
 * @typedef {Object} LocalOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [remote=identity] The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
 * @property {Function} [module] The function used to import modules when remote asks to `import(...)` something.
 * @property {boolean} [buffer=false] Optionally allows direct buffer serialization breaking JSON compatibility. This requires the `encoder` on the local side and the `decoder` on the remote side.
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
  buffer = false,
} = object) => {
  // received values arrive via postMessage so are compatible
  // with the structured clone algorithm
  const fromValue = (value, cache = new Map) => {
    if (!isArray(value)) return value;
    const [t, v] = value;
    switch (t) {
      case OBJECT: {
        if (v === null) return globalThis;
        let cached = cache.get(value);
        if (!cached) {
          cached = v;
          cache.set(value, v);
          for (const k in v) v[k] = fromValue(v[k], cache);
        }
        return cached;
      }
      case ARRAY: {
        return cache.get(value) || (
          cache.set(value, v),
          fromValues(v, cache)
        );
      }
      case FUNCTION: {
        let wr = weakRefs.get(v), fn = wr?.deref();
        if (!fn) {
          /* c8 ignore start */
          if (wr) fr.unregister(wr);
          /* c8 ignore stop */
          fn = function (...args) {
            remote.apply(this, args);

            // values reflected asynchronously are not passed stringified
            // because it makes no sense to use Atomics and SharedArrayBuffer
            // to transfer these ... yet these must reflect the current state
            // on this local side of affairs.
            for (let i = 0, length = args.length; i < length; i++)
              args[i] = toValue(args[i]);

            const result = reflect('apply', v, toValue(this), args);
            /* c8 ignore start */
            return result instanceof Promise ? result.then(fromValue) : fromValue(result);
            /* c8 ignore stop */
          };
          wr = new WeakRef(fn);
          weakRefs.set(v, wr);
          fr.register(fn, v, wr);
        }
        return fn;
      }
      case SYMBOL: return fromSymbol(v);
      default: return (t & REMOTE) ? ref(v) : v;
    }
  };

  // OBJECT, DIRECT, VIEW, BUFFER, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
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
          tv(DIRECT, $) : (
          isView($) ?
            tv(VIEW, toView($, buffer)) : (
              $ instanceof ArrayBuffer ?
                tv(BUFFER, toBuffer($, buffer)) :
                tv(isArray($) ? REMOTE_ARRAY : REMOTE_OBJECT, id($))
            )
        );
      }
      case 'function': return tv(REMOTE_FUNCTION, id(transform(value)));
      case 'symbol': return tv(SYMBOL, toSymbol(value));
      case 'bigint': return tv(BIGINT, value.toString());
    }
    return value;
  };

  const fromValues = loopValues(fromValue);
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  const { clear, id, ref, unref } = heap();

  const weakRefs = new Map;
  const globalTarget = tv(OBJECT, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect('unref', v);
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
        /* c8 ignore start */
        if (DEBUG) console.debug('DIRECT');
        /* c8 ignore stop */
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
      /* c8 ignore start */
      if (DEBUG) console.debug(method === 'unref' ? 'GC' : 'ROUNDTRIP');
      /* c8 ignore stop */
      const isGlobal = uid === null;
      const target = isGlobal ? globalThis : ref(uid);
      // the order is by most common use cases
      switch (method) {
        case 'get': {
          const key = fromKey(args[0]);
          return toValue(isGlobal && key === 'import' ? module : Reflect.get(target, key));
        }
        case 'apply': {
          const map = new Map;
          return toValue(Reflect.apply(target, fromValue(args[0], map), fromValues(args[1], map)));
        }
        case 'set': return Reflect.set(target, fromKey(args[0]), fromValue(args[1]));
        case 'has': return Reflect.has(target, fromKey(args[0]));
        case 'ownKeys': return toKeys(Reflect.ownKeys(target), weakRefs);
        case 'construct': return toValue(Reflect.construct(target, fromValues(args[0])));
        case 'getOwnPropertyDescriptor': {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, fromKey(args[0]));
          if (descriptor) {
            for (const k in descriptor)
              descriptor[k] = toValue(descriptor[k]);
          }
          return descriptor;
        }
        case 'defineProperty': return Reflect.defineProperty(target, fromKey(args[0]), fromValue(args[1]));
        case 'deleteProperty': return Reflect.deleteProperty(target, fromKey(args[0]));
        case 'getPrototypeOf': return toValue(Reflect.getPrototypeOf(target));
        case 'setPrototypeOf': return Reflect.setPrototypeOf(target, fromValue(args[0]));
        case 'assign': {
          assign(target, fromValue(args[0]));
          return;
        }
        case 'gather': {
          args = fromKeys(args[0], weakRefs);
          for (let i = 0, length = args.length; i < length; i++)
            args[i] = toValue(target[args[i]]);
          return args;
        }
        case 'unref': return unref(uid);
        default: return Reflect[method](target);
      }
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

// import DEBUG from './utils/debug.js';

import {
  UNREF,
  ASSIGN,
  EVALUATE,
  GATHER,
  QUERY,

  APPLY,
  CONSTRUCT,
  DEFINE_PROPERTY,
  DELETE_PROPERTY,
  GET,
  GET_OWN_PROPERTY_DESCRIPTOR,
  GET_PROTOTYPE_OF,
  HAS,
  IS_EXTENSIBLE,
  OWN_KEYS,
  SET,
  SET_PROTOTYPE_OF,
} from './utils/traps.js';

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

import { ImageData } from './direct/web.js';

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

import gather from './utils/gather.js';
import query from './utils/query.js';

import heap from './utils/heap.js';

const Node = globalThis.Node || class Node {};

const {
  apply,
  construct,
  defineProperty,
  deleteProperty,
  get,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  has,
  isExtensible,
  ownKeys,
  set,
  setPrototypeOf,
} = Reflect;

/**
 * @typedef {Object} LocalOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [remote=identity] The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
 * @property {Function} [module] The function used to import modules when remote asks to `import(...)` something.
 * @property {boolean} [buffer=false] Optionally allows direct buffer serialization breaking JSON compatibility.
 * @property {number} [timeout=-1] Optionally allows remote values to be cached when possible for a `timeout` milliseconds value. `-1` means no timeout.
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
  timeout = -1,
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

            const result = reflect(APPLY, v, toValue(this), args);
            return result.then(fromValue);
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
        return ((hasDirect && direct.has($)) || $ instanceof ImageData) ?
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

  const arrayKey = /^(?:[0-9]+|length)$/;
  const memoize = -1 < timeout;
  const weakRefs = new Map;
  const globalTarget = tv(OBJECT, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect(UNREF, v);
  });

  let hasDirect = false, direct;

  return {
    assign,
    gather,
    query,

    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (!hasDirect) {
        // if (DEBUG) console.debug('DIRECT');
        hasDirect = true;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * Provide a portable API that just invokes the given callback with the given arguments.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback, ...args) => apply(callback, null, args),

    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect(method, uid, ...args) {
      // if (DEBUG) console.debug(method === UNREF ? 'GC' : 'ROUNDTRIP');
      const isGlobal = uid === null;
      const target = isGlobal ? globalThis : ref(uid);
      // the order is by most common use cases
      switch (method) {
        case GET: {
          const key = fromKey(args[0]);
          const asModule = isGlobal && key === 'import';
          const value = asModule ? module : get(target, key);
          const result = toValue(value);
          if (!memoize) return result;
          let cache = asModule, t = target, d;
          if (!asModule && !(
            // avoid caching DOM related stuff (all accessors)
            (t instanceof Node) ||
            // avoid also caching Array length or index accessors
            (isArray(t) && typeof key === 'string' && arrayKey.test(key))
          )) {
            // cache unknown properties but ...
            if (key in target) {
              // ... avoid caching accessors!
              while (!(d = getOwnPropertyDescriptor(t, key))) {
                t = getPrototypeOf(t);
                /* c8 ignore start */
                // this is an emergency case for "unknown" values
                if (!t) break;
                /* c8 ignore stop */
              }
              cache = !!d && 'value' in d;
            }
            // accessing non existent properties could be repeated
            // for no reason whatsoever and it gets removed once
            // the property is eventually set so ...
            else cache = true;
          }
          return [cache, result];
        }
        case APPLY: {
          const map = new Map;
          return toValue(apply(target, fromValue(args[0], map), fromValues(args[1], map)));
        }
        case SET: return set(target, fromKey(args[0]), fromValue(args[1]));
        case HAS: return has(target, fromKey(args[0]));
        case OWN_KEYS: return toKeys(ownKeys(target), weakRefs);
        case CONSTRUCT: return toValue(construct(target, fromValues(args[0])));
        case GET_OWN_PROPERTY_DESCRIPTOR: {
          const descriptor = getOwnPropertyDescriptor(target, fromKey(args[0]));
          if (descriptor) {
            for (const k in descriptor)
              descriptor[k] = toValue(descriptor[k]);
          }
          return descriptor;
        }
        case DEFINE_PROPERTY: return defineProperty(target, fromKey(args[0]), fromValue(args[1]));
        case DELETE_PROPERTY: return deleteProperty(target, fromKey(args[0]));
        case GET_PROTOTYPE_OF: return toValue(getPrototypeOf(target));
        case SET_PROTOTYPE_OF: return setPrototypeOf(target, fromValue(args[0]));
        case ASSIGN: {
          assign(target, fromValue(args[0]));
          return;
        }
        case EVALUATE: {
          const body = fromValue(args[0]);
          const fn = Function(`return(${body}).apply(null,arguments)`);
          return toValue(apply(fn, null, fromValues(args[1])));
        }
        case GATHER: {
          args = fromKeys(args[0], weakRefs);
          for (let k, i = 0, length = args.length; i < length; i++) {
            k = args[i];
            args[i] = toValue(typeof k === 'string' ? query(target, k) : target[k]);
          }
          return args;
        }
        case QUERY: return toValue(query(target, args[0]));
        case UNREF: return unref(uid);
        case IS_EXTENSIBLE: return isExtensible(target);
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

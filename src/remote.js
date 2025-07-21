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
  REMOTE,
  OBJECT,
  ARRAY,
  FUNCTION,
  SYMBOL,
  BIGINT,
  VIEW,
  BUFFER,

  REMOTE_OBJECT,
  REMOTE_FUNCTION
} from './types.js';

import {
  fromSymbol,
  toSymbol,
} from './utils/symbol.js';

import {
  fromBuffer,
  fromView,
} from './utils/typed.js';

import {
  toName,
} from './utils/global.js';

import {
  assign,
  isArray,
  isView,
  fromKey,
  toKey,
  identity,
  loopValues,
  array,
  object,
  callback,
  tv,
} from './utils/index.js';

import toJSONCallback from './utils/to-json-callback.js';

import query from './utils/query.js';

import heap from './utils/heap.js';

import memo from './utils/memo.js';

/**
 * @typedef {Object} RemoteOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. All `Reflect` methods + `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [released=identity] The function invoked when a reference is released.
 * @property {boolean} [buffer=false] Optionally allows direct buffer deserialization breaking JSON compatibility.
 * @property {number} [timeout=-1] Optionally allows remote values to be cached when possible for a `timeout` milliseconds value. `-1` means no timeout.
 */

/**
 * @param {RemoteOptions} options
 * @returns
 */
export default ({
  reflect = identity,
  transform = identity,
  released = identity,
  buffer = false,
  timeout = -1,
} = object) => {
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  // OBJECT, DIRECT, VIEW, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  const fromValue = value => {
    if (!isArray(value)) return value;
    const [t, v] = value;
    if (t & REMOTE) return asProxy(t, v);
    switch (t) {
      case OBJECT: return global;
      case DIRECT: return v;
      case SYMBOL: return fromSymbol(v);
      case BIGINT: return BigInt(v);
      case VIEW: return fromView(v, buffer);
      case BUFFER: return fromBuffer(v, buffer);
      // there is no other case
    }
  };

  const toValue = (value, cache = new Map) => {
    switch (typeof value) {
      case 'object': {
        if (value === null) break;
        if (value === globalThis) return globalTarget;
        if (reflected in value) return reference;
        let cached = cache.get(value);
        if (!cached) {
          const $ = transform(value);
          if (indirect || !direct.has($)) {
            if (isArray($)) {
              const a = [];
              cached = tv(ARRAY, a);
              cache.set(value, cached);
              for (let i = 0, length = $.length; i < length; i++)
                a[i] = toValue($[i], cache);
              return cached;
            }
            if (!isView($) && !($ instanceof ArrayBuffer) && toName($) === 'Object') {
              const o = {};
              cached = tv(OBJECT, o);
              cache.set(value, cached);
              for (const k in $)
                o[k] = toValue($[k], cache);
              return cached;
            }
          }
          cached = tv(DIRECT, $);
          cache.set(value, cached);
        }
        return cached;
      }
      case 'function': {
        if (reflected in value) return reference;
        let cached = cache.get(value);
        if (!cached) {
          const $ = transform(value);
          cached = tv(FUNCTION, id($));
          cache.set(value, cached);
        }
        return cached;
      }
      case 'symbol': return tv(SYMBOL, toSymbol(value));
    }
    return value;
  };

  const toValues = loopValues(toValue);

  const asProxy = (t, v) => {
    let wr = weakRefs.get(v), proxy = wr?.deref();
    if (!proxy) {
      /* c8 ignore start */
      if (wr) fr.unregister(wr);
      /* c8 ignore stop */
      if (t === REMOTE_FUNCTION)
        proxy = new Proxy(callback, new FunctionHandler(t, v));
      else
        proxy = new Proxy(t === REMOTE_OBJECT ? object : array, new Handler(t, v));
      wr = new WeakRef(proxy);
      weakRefs.set(v, wr);
      fr.register(proxy, v, wr);
    }
    return proxy;
  };

  /**
   * Checks if the given value is a proxy created in the remote side.
   * @param {any} value
   * @returns {boolean}
   */
  const isProxy = value => {
    switch (typeof value) {
      case 'object': if (value === null) break;
      case 'function': return reflected in value;
    }
    return false;
  };

  const memoize = -1 < timeout;
  const Memo = /** @type {typeof import('./ts/memo.js').Memo} */(
    memoize ? memo(timeout) : Map
  );

  class Handler {
    constructor(t, v) {
      this.t = t;
      this.v = v;
      if (memoize) this.$ = new Memo;
    }

    get(_, key) {
      if (memoize && this.$.has(key)) return this.$.get(key);
      const value = reflect(GET, this.v, toKey(key));
      return memoize ?
        (value[0] ?
          this.$.set(key, fromValue(value[1])) :
          fromValue(value[1])) :
        fromValue(value)
      ;
    }

    set(_, key, value) {
      const result = reflect(SET, this.v, toKey(key), toValue(value));
      return memoize ? this.$.drop(key, result) : result;
    }

    // TODO: should `in` operations be cached too?
    has(_, prop) {
      if (prop === reflected) {
        reference = [this.t, this.v];
        return true;
      }
      return reflect(HAS, this.v, toKey(prop));
    }

    _oK() { return fromKeys(reflect(OWN_KEYS, this.v), weakRefs) }
    ownKeys(_) {
      return memoize ?
        (this.$.has(Memo.keys) ?
          this.$.get(Memo.keys) :
          this.$.set(Memo.keys, this._oK())) :
        this._oK()
      ;
    }

    // this would require a cache a part per each key or make
    // the Cache code more complex for probably little gain
    getOwnPropertyDescriptor(_, key) {
      const descriptor = fromValue(reflect(GET_OWN_PROPERTY_DESCRIPTOR, this.v, toKey(key)));
      if (descriptor) {
        for (const k in descriptor)
          descriptor[k] = fromValue(descriptor[k]);
      }
      return descriptor;
    }

    defineProperty(_, key, descriptor) {
      const result = reflect(DEFINE_PROPERTY, this.v, toKey(key), toValue(descriptor));
      return memoize ? this.$.drop(key, result) : result;
    }

    deleteProperty(_, key) {
      const result = reflect(DELETE_PROPERTY, this.v, toKey(key));
      return memoize ? this.$.drop(key, result) : result;
    }

    _gPO() { return fromValue(reflect(GET_PROTOTYPE_OF, this.v)) }
    getPrototypeOf(_) {
      /* c8 ignore start */
      return memoize ?
        (this.$.has(Memo.proto) ?
          this.$.get(Memo.proto) :
          this.$.set(Memo.proto, this._gPO())) :
        this._gPO()
      ;
      /* c8 ignore stop */
    }

    setPrototypeOf(_, value) {
      const result = reflect(SET_PROTOTYPE_OF, this.v, toValue(value));
      return memoize ? this.$.drop(Memo.proto, result) : result;
    }
    // way less common than others to be cached
    isExtensible(_) { return reflect(IS_EXTENSIBLE, this.v) }

    // ⚠️ due shared proxies' targets this cannot be reflected
    preventExtensions(_) { return false }
  }

  class FunctionHandler extends Handler {
    construct(_, args) { return fromValue(reflect(CONSTRUCT, this.v, toValues(args))) }

    apply(_, self, args) {
      const map = new Map;
      return fromValue(reflect(APPLY, this.v, toValue(self, map), toValues(args, map)));
    }

    get(_, key) {
      switch (key) {
        // skip obvious roundtrip cases
        case 'apply': return (self, args) => this.apply(_, self, args);
        case 'call': return (self, ...args) => this.apply(_, self, args);
        default: return super.get(_, key);
      }
    }
  }

  let indirect = true, direct, reference;

  const { apply } = Reflect;
  const { id, ref, unref } = heap();
  const weakRefs = new Map;
  const reflected = Symbol('reflected-ffi');
  const globalTarget = tv(OBJECT, null);
  const global = new Proxy(object, new Handler(OBJECT, null));
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect(UNREF, v);
  });

  return {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global,

    isProxy,

    /** @type {typeof assign} */
    assign(target, ...sources) {
      const asProxy = isProxy(target);
      const assignment = assign(asProxy ? {} : target, ...sources);
      if (asProxy) reflect(ASSIGN, reference[1], toValue(assignment));
      return target;
    },

    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (indirect) {
        indirect = false;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * Evaluates elsewhere the given callback with the given arguments.
     * This utility is similar to puppeteer's `page.evaluate` where the function
     * content is evaluated in the local side and its result is returned.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback, ...args) => fromValue(
      reflect(EVALUATE, null, toJSONCallback(callback), toValues(args))
    ),

    /**
     * @param {object} target
     * @param  {...(string|symbol)} keys
     * @returns {any[]}
     */
    gather(target, ...keys) {
      const asProxy = isProxy(target);
      const asValue = asProxy ? fromValue : (key => target[key]);
      if (asProxy) keys = reflect(GATHER, reference[1], toKeys(keys, weakRefs));
      for (let i = 0; i < keys.length; i++) keys[i] = asValue(keys[i]);
      return keys;
    },

    /**
     * Queries the given target for the given path.
     * @param {any} target
     * @param {string} path
     * @returns {any}
     */
    query: (target, path) => (
      isProxy(target) ?
        fromValue(reflect(QUERY, reference[1], path)) :
        query(target, path)
    ),

    /**
     * The callback needed to resolve any local call. Currently only `apply` and `unref` are supported.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: async (method, uid, ...args) => {
      switch (method) {
        case APPLY: {
          const [context, params] = args;
          for (let i = 0, length = params.length; i < length; i++)
            params[i] = fromValue(params[i]);
          return toValue(await apply(ref(uid), fromValue(context), params));
        }
        case UNREF: {
          released(ref(uid));
          return unref(uid);
        }
      }
    },
  };
};

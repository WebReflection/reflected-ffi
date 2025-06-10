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
  REMOTE_ARRAY,
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
  object,
  tv,
} from './utils/index.js';

import heap from './utils/heap.js';

const { preventExtensions } = Object;

/**
 * @typedef {Object} RemoteOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. All `Reflect` methods + `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [released=identity] The function invoked when a reference is released.
 */

/**
 * @param {RemoteOptions} options
 * @returns
 */
export default ({
  reflect = identity,
  transform = identity,
  released = identity,
} = object) => {
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  // OBJECT, DIRECT, VIEW, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  const fromValue = value => {
    if (!isArray(value)) return value;
    const [t, v] = value;
    if (t & REMOTE) return asProxy(value, t, v);
    switch (t) {
      case OBJECT: return global;
      case DIRECT: return v;
      case SYMBOL: return fromSymbol(v);
      case BIGINT: return BigInt(v);
      case VIEW: return fromView(v);
      case BUFFER: return fromBuffer(v);
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

  const asProxy = (tv, t, v) => {
    let wr = weakRefs.get(v), proxy = wr?.deref();
    if (!proxy) {
      /* c8 ignore start */
      if (wr) fr.unregister(wr);
      /* c8 ignore stop */
      proxy = new (
        t === REMOTE_OBJECT ? ObjectHandler :
        (t === REMOTE_ARRAY ? ArrayHandler : FunctionHandler)
      )(tv, v);
      wr = new WeakRef(proxy);
      weakRefs.set(v, wr);
      fr.register(proxy, v, wr);
    }
    return proxy;
  };

  class Handler {
    constructor(_) { this._ = _ }

    get(_, key) { return fromValue(reflect('get', this._, toKey(key))) }
    set(_, key, value) { return reflect('set', this._, toKey(key), toValue(value)) }
    ownKeys(_) { return fromKeys(reflect('ownKeys', this._), weakRefs) }
    getOwnPropertyDescriptor(_, key) {
      const descriptor = fromValue(reflect('getOwnPropertyDescriptor', this._, toKey(key)));
      if (descriptor) {
        for (const k in descriptor)
          descriptor[k] = fromValue(descriptor[k]);
      }
      return descriptor;
    }
    defineProperty(_, key, descriptor) { return reflect('defineProperty', this._, toKey(key), toValue(descriptor)) }
    deleteProperty(_, key) { return reflect('deleteProperty', this._, toKey(key)) }
    getPrototypeOf(_) { return fromValue(reflect('getPrototypeOf', this._)) }
    setPrototypeOf(_, value) { return reflect('setPrototypeOf', this._, toValue(value)) }
    isExtensible(_) { return reflect('isExtensible', this._) }
    preventExtensions(target) { return preventExtensions(target) && reflect('preventExtensions', this._) }
  }

  const has = (_, $, prop) => prop === reflected ?
    !!(reference = _) :
    reflect('has', $, toKey(prop))
  ;

  class ObjectHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy({ _: tv }, super(v));
    }

    has(target, prop) { return has(target._, this._, prop) }
  }

  class ArrayHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy(tv, super(v));
    }

    has(target, prop) { return has(target, this._, prop) }
  }

  class FunctionHandler extends Handler {
    constructor(tv, v) {
      //@ts-ignore
      return new Proxy(asFunction.bind(tv), super(v));
    }

    has(target, prop) { return has(target(), this._, prop) }
    construct(_, args) { return fromValue(reflect('construct', this._, toValues(args))) }

    apply(_, self, args) {
      const map = new Map;
      return fromValue(reflect('apply', this._, toValue(self, map), toValues(args, map)));
    }
  }

  let indirect = true, direct, reference;

  const { id, ref, unref } = heap();
  const weakRefs = new Map;
  const globalTarget = tv(OBJECT, null);
  const reflected = Symbol('reflected-ffi');
  const global = new ObjectHandler(globalTarget, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect('unref', v);
  });

  return {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global,

    /** @type {typeof assign} */
    assign: (target, ...sources) => reflected in target ?
      (reflect('assign', reference[1], toValue(assign({}, ...sources))), target) :
      assign(target, ...sources)
    ,

    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct: value => {
      if (indirect) {
        indirect = false;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * @param {object} target
     * @param  {...(string|symbol)} keys
     * @returns {any[]}
     */
    gather: (target, ...keys) => {
      let asValue = fromValue;
      if (reflected in target)
        keys = reflect('gather', reference[1], toKeys(keys, weakRefs));
      else
        asValue = key => target[key];
      for (let i = 0, length = keys.length; i < length; i++)
        keys[i] = asValue(keys[i]);
      return keys;
    },

    /**
     * Checks if the given value is a proxy created in the remote side.
     * @param {any} value
     * @returns {boolean}
     */
    isProxy: value => {
      switch (typeof value) {
        case 'object': if (value === null) break;
        case 'function': return reflected in value;
        default: return false;
      }
    },

    /**
     * The callback needed to resolve any local call. Currently only `apply` and `unref` are supported.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {string} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method, uid, ...args) => {
      switch (method) {
        case 'apply': {
          const [context, params] = args;
          for (let i = 0, length = params.length; i < length; i++)
            params[i] = fromValue(params[i]);
          return toValue(Reflect.apply(ref(uid), fromValue(context), params));
        }
        case 'unref': {
          released(ref(uid));
          return unref(uid);
        }
      }
    },
  };
};

function asFunction() {
  return this;
}

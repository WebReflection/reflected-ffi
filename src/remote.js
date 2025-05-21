import {
  DIRECT,
  REMOTE,
  OBJECT,
  ARRAY,
  FUNCTION,
  SYMBOL,
  BIGINT,
  VIEW,

  REMOTE_OBJECT,
  REMOTE_ARRAY,
} from './types.js';

import {
  isArray,
  isView,
  fromKey,
  fromSymbol,
  toKey,
  toSymbol,
  identity,
  loopValues,
  object,
  _$,
} from './utils.js';

import heap from './heap.js';

const { getPrototypeOf, preventExtensions } = Object;
const { apply } = Reflect;
const { toString } = object;

const toName = (ref, name = toString.call(ref).slice(8, -1)) =>
  name in globalThis ? name : toName(getPrototypeOf(ref) || object);

/**
 * @typedef {Object} RemoteOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. All `Reflect` methods + `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 */

/**
 * @param {RemoteOptions} options
 * @returns
 */
export default ({
  reflect = identity,
  transform = identity,
} = object) => {
  const fromKeys = loopValues(fromKey);

  // OBJECT, DIRECT, VIEW, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  const fromValue = value => {
    if (!isArray(value)) return value;
    const [t, v] = value;
    if (t & REMOTE) return asProxy(value, t, v);
    switch (t) {
      case OBJECT: return global;
      case SYMBOL: return fromSymbol(v);
      case BIGINT: return BigInt(v);
      case DIRECT: return v;
      case VIEW: return new globalThis[v[0]](v[1]);
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
              cached = _$(ARRAY, a);
              cache.set(value, cached);
              for (let i = 0, length = $.length; i < length; i++)
                a[i] = toValue($[i], cache);
              return cached;
            }
            if (!isView($) && toName($) === 'Object') {
              const o = {};
              cached = _$(OBJECT, o);
              cache.set(value, cached);
              for (const k in $)
                o[k] = toValue($[k], cache);
              return cached;
            }
          }
          cached = _$(DIRECT, $);
          cache.set(value, cached);
        }
        return cached;
      }
      case 'function': {
        if (reflected in value) return reference;
        let cached = cache.get(value);
        if (!cached) {
          const $ = transform(value);
          cached = _$(FUNCTION, id($));
          cache.set(value, cached);
        }
        return cached;
      }
      case 'symbol': return _$(SYMBOL, toSymbol(value));
    }
    return value;
  };

  const toValues = loopValues(toValue);

  const asProxy = (_$, _, $) => {
    let wr = weakRefs.get($), proxy = wr?.deref();
    if (!proxy) {
      if (wr) fr.unregister(wr);
      proxy = new (
        _ === REMOTE_OBJECT ? ObjectHandler :
        (_ === REMOTE_ARRAY ? ArrayHandler : FunctionHandler)
      )(_$, $);
      wr = new WeakRef(proxy);
      weakRefs.set($, wr);
      fr.register(proxy, $, wr);
    }
    return proxy;
  };

  class Handler {
    constructor($) { this.$ = $ }

    get(_, key) { return fromValue(reflect('get', this.$, toKey(key))) }
    set(_, key, value) { return reflect('set', this.$, toKey(key), toValue(value)) }
    ownKeys(_) { return fromKeys(reflect('ownKeys', this.$), weakRefs) }
    getOwnPropertyDescriptor(_, key) {
      const descriptor = fromValue(reflect('getOwnPropertyDescriptor', this.$, toKey(key)));
      if (descriptor) {
        for (const k in descriptor)
          descriptor[k] = fromValue(descriptor[k]);
      }
      return descriptor;
    }
    defineProperty(_, key, descriptor) { return reflect('defineProperty', this.$, toKey(key), toValue(descriptor)) }
    deleteProperty(_, key) { return reflect('deleteProperty', this.$, toKey(key)) }
    getPrototypeOf(_) { return fromValue(reflect('getPrototypeOf', this.$)) }
    setPrototypeOf(_, value) { return reflect('setPrototypeOf', this.$, toValue(value)) }
    isExtensible(_) { return reflect('isExtensible', this.$) }
    preventExtensions(target) { return preventExtensions(target) && reflect('preventExtensions', this.$) }
  }

  const has = (_, $, prop) => prop === reflected ?
    !!(reference = _) :
    reflect('has', $, toKey(prop))
  ;

  class ObjectHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy({ $: _$ }, super($));
    }

    has(target, prop) { return has(target.$, this.$, prop) }
  }

  class ArrayHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy(_$, super($));
    }

    has(target, prop) { return has(target, this.$, prop) }
  }

  class FunctionHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy(asFunction.bind(_$), super($));
    }

    has(target, prop) { return has(target(), this.$, prop) }
    construct(_, args) { return fromValue(reflect('construct', this.$, toValues(args))) }

    apply(_, self, args) {
      const map = new Map;
      return fromValue(reflect('apply', this.$, toValue(self, map), toValues(args, map)));
    }
  }

  let indirect = true, direct, reference;

  const { id, ref, unref } = heap();
  const weakRefs = new Map;
  const globalTarget = _$(OBJECT, null);
  const reflected = Symbol('reflected-ffi');
  const global = new ObjectHandler(globalTarget, null);
  const fr = new FinalizationRegistry($ => {
    weakRefs.delete($);
    reflect('unref', $);
  });

  return {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global,

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
     * Checks if the given value is a proxy created in the remote side.
     * @param {any} value
     * @returns {boolean}
     */
    isProxy: value => (
      typeof value === 'object' &&
      value !== null &&
      reflected in value
    ),

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
      if (method === 'unref') return unref(uid);
      if (method === 'apply') {
        const [context, params] = args;
        for (let i = 0, length = params.length; i < length; i++)
          params[i] = fromValue(params[i]);
        return toValue(apply(ref(uid), fromValue(context), params));
      }
    },
  };
};

function asFunction() {
  return this;
}

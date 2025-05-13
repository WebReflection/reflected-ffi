import {
  DIRECT,
  OBJECT,
  ARRAY,
  FUNCTION,
  REMOTE,
  SYMBOL,

  REMOTE_OBJECT,
  REMOTE_ARRAY,
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

function asFunction() {
  return this;
}

const { keys, preventExtensions } = Object;
const { isView } = ArrayBuffer;
const { apply } = Reflect;

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
} = {}) => {
  const fromKeys = loopValues(fromKey);

  const fromValue = (_$, cache = new Map) => {
    const [_, $] = _$;
    switch (_) {
      case OBJECT: {
        if ($ === null) return global;
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
      case FUNCTION: return ref($);
      case SYMBOL: return fromSymbol($);
    }
    return (_ & REMOTE) ? asProxy(_$, _, $) : $;
  };

  const fromValues = loopValues(fromValue);

  const toValue = (value, cache = new Map) => {
    switch (typeof value) {
      case 'object': {
        if (value === null || isView(value)) return _$(DIRECT, value);
        if (remote in value) return reference;
        if (value === globalThis) return globalTarget;
        let cached = cache.get(value);
        if (!cached) {
          const $ = transform(value);
          if (indirect || !directValue.has($)) {
            if (isArray($)) {
              const a = [];
              cached = _$(ARRAY, a);
              cache.set(value, cached);
              for (let i = 0; i < $.length; i++)
                a[i] = toValue($[i], cache);
              return cached;
            }
            // TODO: Natives don't have own keys ... or do they?
            const props = keys($);
            const length = props.length;
            if (length) {
              const o = {};
              cached = _$(OBJECT, o);
              cache.set(value, cached);
              for (let prop, i = 0; i < length; i++) {
                prop = props[i];
                o[prop] = toValue($[prop], cache);
              }
              return cached;
            }
          }
          cached = _$(DIRECT, $);
          cache.set(value, cached);
        }
        return cached;
      }
      case 'function': {
        if (remote in value) return reference;
        return _$(FUNCTION, id(value));
      }
      case 'symbol': return _$(SYMBOL, toSymbol(value));
    }
    return _$(DIRECT, value);
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
    constructor($) {
      this.$ = $;
    }

    defineProperty(_, key, descriptor) {
      return reflect('defineProperty', this.$, toKey(key), toValue(descriptor));
    }

    deleteProperty(_, key) {
      return reflect('deleteProperty', this.$, toKey(key));
    }

    get(_, key) {
      return fromValue(reflect('get', this.$, toKey(key)));
    }

    getOwnPropertyDescriptor(_, key) {
      const descriptor = reflect('getOwnPropertyDescriptor', this.$, toKey(key));
      if (descriptor) {
        const map = new Map;
        const { get, set, value } = descriptor;
        if (get) descriptor.get = fromValue(get, map);
        if (set) descriptor.set = fromValue(set, map);
        if (value) descriptor.value = fromValue(value, map);
      }
      return descriptor;
    }

    getPrototypeOf(_) {
      return fromValue(reflect('getPrototypeOf', this.$));
    }

    isExtensible(_) {
      return reflect('isExtensible', this.$);
    }

    ownKeys(_) {
      return fromKeys(reflect('ownKeys', this.$), weakRefs);
    }

    preventExtensions(target) {
      return preventExtensions(target) && reflect('preventExtensions', this.$);
    }

    set(_, key, value) {
      return reflect('set', this.$, toKey(key), toValue(value));
    }

    setPrototypeOf(_, value) {
      return reflect('setPrototypeOf', this.$, toValue(value));
    }
  }

  const has = ($, prop) => reflect('has', $, toKey(prop));

  class ObjectHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy({ $: _$ }, super($));
    }

    has(target, prop) {
      if (prop === remote) {
        reference = target.$;
        return true;
      }
      return has(this.$, prop);
    }
  }

  class ArrayHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy(_$, super($));
    }

    has(target, prop) {
      if (prop === remote) {
        reference = target;
        return true;
      }
      return has(this.$, prop);
    }
  }

  class FunctionHandler extends Handler {
    constructor(_$, $) {
      //@ts-ignore
      return new Proxy(asFunction.bind(_$), super($));
    }

    has(target, prop) {
      if (prop === remote) {
        reference = target();
        return true;
      }
      return has(this.$, prop);
    }

    // TODO: new target ?
    construct(_, args) {
      return fromValue(reflect('construct', this.$, toValues(args)));
    }

    apply(_, self, args) {
      const map = new Map;
      return fromValue(reflect('apply', this.$, toValue(self, map), toValues(args, map)));
    }
  }

  const fr = new FinalizationRegistry($ => {
    weakRefs.delete($);
    reflect('unref', $);
  });

  let reference;
  let indirect = true;

  const weakRefs = new Map;
  const remote = Symbol('remote');
  const directValue = new WeakSet;
  const globalTarget = _$(OBJECT, null);
  const global = new ObjectHandler(globalTarget, null);

  const { id, ref, unref } = heap();

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
    direct(value) {
      if (indirect) indirect = false;
      directValue.add(value);
      return value;
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
        case 'unref':
          return unref(uid);
        case 'apply': {
          const map = new Map;
          return toValue(apply(ref(uid), fromValue(args[0], map), fromValues(args[1], map)));
        }
      }
    }
  };
};

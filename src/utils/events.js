// This is an optional utility that needs to patch `addEventListener`.
// Its `default` return value can be used as `remote` field when
// the `local({ remote: ... })` is invoked.

const { addEventListener } = EventTarget.prototype;
const eventsHandler = new WeakMap;
Reflect.defineProperty(EventTarget.prototype, 'addEventListener', {
  /**
   * Intercepts `options` with an `invoke` field that could contain
   * `preventDefault`, `stopPropagation` or `stopImmediatePropagation`
   * strings so that when the event will be triggered locally,
   * the remote side can still enforce one of those operations, even if
   * invoked asynchronously (those calls will happen on the local thread).
   * 
   * @param {string} type
   * @param {EventListenerOrEventListenerObject?} callback
   * @param  {AddEventListenerOptions & { invoke?: string|string[]} | boolean} options
   * @returns {void}
   */
  value(type, callback, options) {
    //@ts-ignore
    const invoke = options?.invoke;
    if (invoke) {
      let map = eventsHandler.get(this);
      if (!map) eventsHandler.set(this, (map = new Map));
      map.set(type, [].concat(invoke));
      //@ts-ignore
      delete options.invoke;
    }
    return addEventListener.apply(this, arguments);
  },
});

/**
 * This utility is used to perform `preventDefault` or `stopPropagation`
 * on events that are triggered via functions defined on the remote side.
 * It is meant to be passed as `remote`, or as part of `remote` field when
 * the `local({ remote: ... })` is invoked, meaning it happens right before
 * the *remote* event handler is requested to be called.
 * @param {Event} event
 */
export default event => {
  const { currentTarget, target, type } = event;
  const methods = eventsHandler.get(currentTarget || target)?.get(type);
  if (methods) for (const method of methods) event[method]();
};

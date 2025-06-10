# reflected-ffi

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/reflected-ffi/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/reflected-ffi?branch=main)

A remotely reflected Foreign Function Interface.

### Architecture

The **direct**, one way and *remote driven*, architecture is fully based on Proxied pointers (by type)
on the *remote* context that forwards all traps to the local one.

These proxies can represent *arrays* (`[ ptr ]`), *objects* (`{ ptr }`) or classes,
methods or all other functions (`function(){ return ptr }`), ensuring all traps
will produce the expected result and checks such as `Array.isArray(proxy)` or `proxy instanceof Array`
will also produce the correct result.

Proxies created on the *local* context are cached until the *remote* consumer notifies that
such proxy is not needed anymore remotely so that the *local* context can free its memory.

This dance is done via [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry) and a special `unref(ptr)` trap based on the very same stack/logic.

The *remote* context also retains its own *callbacks* that can be invoked from the *local* context,
but that's the only thing the *local* can do with the *remote* driver, useful to attach listeners
remotely or offer non-blocking/expensive utilities to the *local* context.

```
            ┌────── synchronous ─────┐
            ↓                        │
┌───────────────────────┐            ↑
│    reflect locally    │ ┌──────────┴─────────┐           
│  the remotely invoked │ │ Proxy trap invoked │ 
│      Proxy trap       │ └──────────┬─────────┘
└───────────┬───────────┘            │
            ↓                        ↑
     ╔═══════════════╗ → ─── ╔═══════╩════════╗
     ║ local context ║ apply ║ remote context ║
     ╚══════╦════════╝ ─── ← ╚═══════╦════════╝
            ↓                        ↑
┌───────────────────────┐ ┌──────────┴────────────┐
│ primitive, buffers or │ │ primitive, buffers or │
│ views directly, other │ │ views directly, other │
│ references as pointer │ │  pointers as Proxies  │
└───────────┬───────────┘ └──────────┬────────────┘
            ↓                        ↑
            └────────────────────────┘
```

When it comes to a *Worker* or *MessageChannel* based approach, the **buffered** logic is implemented
via [Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)
so that the *remote* driver can still use *synchronously* anything the *local* context offers,
but it's not true the other way around: the *local* context can only invoke asynchronously *remote* callbacks.

```
            ┌────── synchronous ─────┐
            ↓                        ↑
┌───────────────────────┐ ┌──────────┴─────────┐
│ Worker/MessageChannel │ │ socket/postMessage │
│  handler to resolve   │ │  via Atomics.wait  │
│   values & pointers   │ └──────────┬─────────┘ 
│  and reflect locally  │            ↑
│  the remotely invoked │ ┌──────────┴─────────┐
│      Proxy trap       │ │ Proxy trap invoked │ 
└───────────┬───────────┘ └──────────┬─────────┘
            ↓                        ↑
     ╔═══════════════╗ → ─── ╔═══════╩════════╗
     ║ local context ║ async ║ remote context ║
     ╚══════╦════════╝ ─── ← ╚═══════╦════════╝
            ↓                        ↑
┌───────────────────────┐ ┌──────────┴────────────┐
│ primitive, buffers or │ │ primitive, buffers or │
│ views directly, other │ │ views directly, other │
│ references as pointer │ │ references as Proxies │
└───────────┬───────────┘ └──────────┬────────────┘
            ↓                        ↑
  ┌───────────────────┐    ┌─────────┴─────────┐
  │ SharedArrayBuffer │    │ SharedArrayBuffer │
  │ encoding + notify │    │ decoding + parse  │
  └─────────┬─────────┘    └─────────┬─────────┘
            ↓                        ↑
            └────────────────────────┘
```

#### Architecture Constraints & Workarounds

All *local* references are retained within the *local* context to reflect atomically
their state at any point in time. The only exception to this rule is for primitives,
buffers or their view (that is: [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)).

The reason for these to travel directly is that strings, as example, are immutable,
while buffers or views would be extremely slow to handle behind a proxied roundtrip,
defeating almost entirely their whole purpose or existence.

Any other *array* or *object*, even those created "*one-off*", are proxied so that
if these change in the *local* context, these changes will be reflected in the *remote* one,
and vice-versa, any change the *remote* context does to these references will be reflected
on the *local* context too.

This is the reason the *API* offers a `direct(reference)` utility, which is like an *identity*
function for the consumer (the reference is returned as is) but it travels directly without
creating a *pointer* or a *Proxy* once landed in the *remote* context.

However, this reference must be either *JSON* compatible or, when the `buffer` option is `true`,
it must be represented as *Uint8Array* of a *buffer* or an *array* containing *uint8* values.

Combining `direct` utility and `direct` option with *buffer*, it is indeed circumvent entirely
the need to proxy values that are meant to be consumed and forgotten right away.

```js
// local context
import local from 'reflected-ffi/local';
import { encoder } from 'reflected-ffi/encoder';

// any buffered based serializer
import BufferedClone from 'buffered-clone';
const { encode } = new BufferedClone;

const encodeInto = encoder({
  // keep room to notify at index 0
  byteOffset: 4,
  // provide a direct encoder or, if omitted,
  // a simple JSON serializer is used instead
  direct: value => encode(value)
  // must be instanceof Uint8Array
});

const remote = new Worker('./remote.js', { type: 'module' });
const { direct, reflect, terminate } = local({
  // opt in for buffered based logic
  buffer: true,
  // not implemented for topic purpose
  reflect(...args) { /* ... */ }
});

remote.onmessage = ({ data: [i32a, [trap, ...rest]] }) => {
  // retrieve the result
  const result = reflect(trap, ...rest);

  // ignore `unref` (its value is `0`) as it doesn't need Atomics
  if (!trap) return;

  // store it into the SharedArrayBuffer
  encodeInto(reflect(...args), i32a.buffer);
  // notify at index 0 it's all good
  i32a[0] = 1;
  Atomics.notify(i32a, 0);
};

// global utility example/logic that returns
// an object literal without creating proxies
globalThis.directObject = () => {
  return direct({ this_is: 'direct' });
};
```

The *remote* counter-setup in this case can invoke `local.directObject()` and receive an object literal that won't belong, or exist, on the *local* context as it was never held to be addressed in the future from the *remote* context.

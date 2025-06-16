# reflected-ffi

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/reflected-ffi/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/reflected-ffi?branch=main)

<sup>**Social Media Photo by [iuliu illes](https://unsplash.com/@illes_cristi) on [Unsplash](https://unsplash.com/)**</sup>


A remotely reflected Foreign Function Interface.


## How To Bootstrap

You can check both [local boilerplate](./test/boilerplate/local.js) and the [remote boilerplate](./test/boilerplate/remote.js) to have an idea of how to orchestrate this module in a way that allows workers to drive the main thread.


### Architecture

The **direct**, one way and *remote driven*, architecture is fully based on Proxied pointers (by type)
on the *remote* context that forwards all traps to the local one.

These proxies can represent *arrays* (`[ ptr ]`), *objects* (`{ ptr }`) or classes,
methods or all other functions (`function(){ return ptr }`), ensuring all traps
will produce the expected result and checks such as `Array.isArray(proxy)` or `proxy instanceof Array`
will also produce the correct result.

Proxies created on the *local* context are cached until the *remote* consumer notifies that
such proxy is not needed anymore remotely so that the *local* context can free its memory and vice-versa.

This dance is orchestrated via the [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry) and a special `unref(ptr)` trap based on the very same stack/logic.

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

const encode = encoder({
  // keep room to notify at index 0 and store length at 1
  byteOffset: 8,
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

  // store it into the SharedArrayBuffer + set written length
  i32a[1] = encode(reflect(...args), i32a.buffer);
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

### Remote Extra Utilities

This project does everything it can to be as fast as possible but it should be clear from the architecture graph that a roundtrip would inevitably add some latency where, even if this is around `0.x` ms, it might affect performance if *60 FPS* is the target from a worker / *remote* driver.

As an attempt to help performance when it matters and it's under control, the following utilities have been added to somehow shortcut *many* rountrips into a single one.

All utilities are also available for local purpose just to provide code portability and feature parity.


#### ➡️ assign(target, ...values)

  * **remote**: it's returned as part of the `remote(...)` invoke
  * **local**: it's available as global `Object.assign` standard method

<details markdown=1><summary>learn more</summary>

This is identical to [Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) except it assigns all values at once "*on the other side*".

```js
import remote from 'reflected-ffi/remote';

// returned as utility once initialized
const { assign, global } = remote({ ... });

// it just works seamlessly within the context
assign({}, { a: 1 }, { b: 2 });

// but it operates *once* with local references
assign(global.document.body, {
  textContent: 'reflected-ffi',
  className: 'is-awesome',
});
```

</details>


#### ⬅️ gather(ref, ...props)

  * **remote**: it's returned as part of the `remote(...)` invoke
  * **local**: it's available as `reflected-ffi/gather` default export

<details markdown=1><summary>learn more</summary>

This utility purpose is to retrieve *many* properties at once using the [array destructuring pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring#array_destructuring):

```js
import remote from 'reflected-ffi/remote';

// returned as utility once initialized
const { gather, global } = remote({ ... });

// returns all references within a single roundtrip
const [navigator, location] = gather(global, 'navigator', 'location');
```

Please note that each *prop* passes through the [query](#querytarget-path) resolver so that `gather(global, "location.href"`), as example, would return the expected value at index `0`.

</details>

#### 🏃 evaluate(callback, ...args)

  * **remote**: it's returned as part of the `remote(...)` invoke
  * **local**: it's available as `reflected-ffi/evaluate` default export (it does *not* evaluate, just apply)

<details markdown=1><summary>learn more</summary>

Inspired by `page.evaluate(() => {})` concept but more powerful, thanks to its ability to return any reflected reference or value, this [CSP hostile](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) utility is based on *Function* evaluation of the provided callback, so that everything within its body will execute on the other side:

```js
import remote from 'reflected-ffi/remote';

// returned as utility once initialized
const { evaluate, global } = remote({ ... });

// will return 3
evaluate((a, b) => a + b, 1, 2);
```

Every synchronous or asynchronous method, function or arrow just works, but for the asynchronous cases one still needs to `await` the result, just like you would regularly.

</details>

#### ⬅️ query(target, path)

  * **remote**: it's returned as part of the `remote(...)` invoke
  * **local**: it's available as `reflected-ffi/query` default export

<details markdown=1><summary>learn more</summary>

Inspired by [jq](https://github.com/jqlang/jq), but not nearly as powerful, the `query` utility goal is to traverse namespaces and somehow "*batch*" their last reached value in a single rountrip.

```js
import remote from 'reflected-ffi/remote';

// returned as utility once initialized
const { query, global } = remote({ ... });

// returns 1 and it does 1 roundtrip
query(global, 'Array.isArray.length');

// one rountrip to grab the body if
// the document is not already around
const body = query(global, 'document.body');
```

Please note there is no evaluation in here, the provided path is simply traversed and it supports indexes and braces notation so that `Array["isArray"]["length"]` would work the same and `namespace.reference[0].value` would work as well.

</details>

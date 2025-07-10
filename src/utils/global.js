import { object } from './index.js';

const { getPrototypeOf } = Object;
const { construct } = Reflect;
const { toStringTag } = Symbol;
const { toString } = object;

// TODO: just use `ref` once this bug has been fixed:
//       https://github.com/micropython/micropython/issues/17657
export const toName = (ref, name = toString.call(getPrototypeOf(ref)).slice(8, -1)) =>
  name in globalThis ? name : toName(getPrototypeOf(ref) || object);

export const toTag = (ref, name = ref[toStringTag]) =>
  name in globalThis ? name : toTag(construct(getPrototypeOf(ref.constructor),[0]));

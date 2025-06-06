import { toTag } from './global.js';

/**
 * @param {[number[], number]} args 
 * @returns {ArrayBufferLike}
 */
export const fromBuffer = args => {
  //@ts-ignore
  if (args[1]) args[1] = { maxByteLength: args[1] };
  else args.pop();
  //@ts-ignore
  return new Uint8Array(...args).buffer;
};

/**
 * @param {[string, [number[], number], number, number]} details
 */
export const fromView = ([name, args, byteOffset, length]) => {
  const buffer = fromBuffer(args);
  const Class = globalThis[name];
  return length ? new Class(buffer, byteOffset, length) : new Class(buffer, byteOffset);
};

/**
 * @param {ArrayBufferLike} value
 * @returns {[number[], number]}
 */
export const toBuffer = value => [
  [...new Uint8Array(value)],
  //@ts-ignore
  value.resizable ? value.maxByteLength : 0
];

/**
 * @param {ArrayBufferView} value
 * @returns {[string, [number[], number], number, number]}
 */
export const toView = value => {
  //@ts-ignore
  const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = value;
  return [
    toTag(value),
    toBuffer(buffer),
    byteOffset,
    length !== ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT) ? length : 0,
  ];
};

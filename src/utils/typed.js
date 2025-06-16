import { toTag } from './global.js';
import { fromArray } from './index.js';

/** @typedef {[ArrayBufferLike|number[], number]} BufferDetails */
/** @typedef {[string, BufferDetails, number, number]} ViewDetails */

/**
 * @param {number} length
 * @param {number} maxByteLength
 * @returns {ArrayBufferLike}
 */
const resizable = (length, maxByteLength) => new ArrayBuffer(length, { maxByteLength });

/**
 * @param {BufferDetails} details 
 * @param {boolean} direct
 * @returns {ArrayBufferLike}
 */
export const fromBuffer = ([value, maxByteLength], direct) => {
  const length = direct ? /** @type {ArrayBufferLike} */ (value).byteLength : /** @type {number[]} */ (value).length;
  if (direct) {
    if (maxByteLength) {
      const buffer = resizable(length, maxByteLength);
      new Uint8Array(buffer).set(new Uint8Array(/** @type {ArrayBufferLike} */ (value)));
      value = buffer;
    }
  }
  else {
    const buffer = maxByteLength ? resizable(length, maxByteLength) : new ArrayBuffer(length);
    new Uint8Array(buffer).set(/** @type {number[]} */ (value));
    value = buffer;
  }
  return /** @type {ArrayBufferLike} */ (value);
};

/**
 * @param {ViewDetails} details
 * @param {boolean} direct
 */
export const fromView = ([name, args, byteOffset, length], direct) => {
  const buffer = fromBuffer(args, direct);
  const Class = globalThis[name];
  return length ? new Class(buffer, byteOffset, length) : new Class(buffer, byteOffset);
};

/**
 * @param {ArrayBufferLike} value
 * @param {boolean} direct
 * @returns {BufferDetails}
 */
export const toBuffer = (value, direct) => [
  direct ? value : fromArray(new Uint8Array(value)),
  //@ts-ignore
  value.resizable ? value.maxByteLength : 0
];

/**
 * @param {ArrayBufferView} value
 * @param {boolean} direct
 * @returns {ViewDetails}
 */
export const toView = (value, direct) => {
  //@ts-ignore
  const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = value;
  return [
    toTag(value),
    toBuffer(buffer, direct),
    byteOffset,
    length !== ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT) ? length : 0,
  ];
};

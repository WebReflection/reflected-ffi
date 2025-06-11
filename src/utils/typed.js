import { toTag } from './global.js';

const fromArray = Array.from;

/** @typedef {[Uint8Array<ArrayBufferLike>|number[], number]} BufferDetails */
/** @typedef {[string, BufferDetails, number, number]} ViewDetails */

export const arrayBuffer = (length, maxByteLength, value) => {
  const buffer = maxByteLength ? new ArrayBuffer(length, { maxByteLength }) : new ArrayBuffer(length);
  new Uint8Array(buffer).set(value);
  return buffer;
};

/**
 * @param {BufferDetails} details 
 * @returns {ArrayBufferLike}
 */
export const fromBuffer = ([value, maxByteLength]) => arrayBuffer(
  value.length,
  maxByteLength,
  value,
);

/**
 * @param {ViewDetails} details
 */
export const fromView = ([name, args, byteOffset, length]) => {
  const buffer = fromBuffer(args);
  const Class = globalThis[name];
  return length ? new Class(buffer, byteOffset, length) : new Class(buffer, byteOffset);
};

/**
 * @param {ArrayBufferLike} value
 * @param {boolean} direct
 * @returns {BufferDetails}
 */
export const toBuffer = (value, direct) => {
  const ui8a = new Uint8Array(value);
  return [
    direct ? ui8a : fromArray(ui8a),
    //@ts-ignore
    value.resizable ? value.maxByteLength : 0
  ];
};

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

export function encode(value: any): number[];
export function encoder({ byteOffset, Array }?: {
    byteOffset?: number;
    Array?: typeof Stack;
}): (value: any, buffer: ArrayBufferLike) => number;
export type Cache = Map<number, number[]>;
import Stack from './array.js';

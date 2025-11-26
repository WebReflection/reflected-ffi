export function encode(value: any): number[];
export function encoder({ byteOffset, Array }?: {
    byteOffset?: number;
    Array?: typeof Stack;
}): (value: any, buffer: ArrayBufferLike) => number | Promise<number>;
export * from "./foreign.js";
export type Cache = Map<number, number[]>;
import Stack from './array.js';

export function decode(value: Uint8Array): any;
export function decoder({ byteOffset }?: {
    byteOffset?: number;
}): (length: number, buffer: ArrayBufferLike) => any;
export * from "./foreign.js";
export type Cache = Map<number, any>;

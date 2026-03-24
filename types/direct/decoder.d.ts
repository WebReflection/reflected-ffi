export function decode(value: Uint8Array): any;
export function decoder({ byteOffset }?: {
    byteOffset?: number;
}): (length: number, buffer: ArrayBufferLike) => any;
export type Cache = Map<number, any>;

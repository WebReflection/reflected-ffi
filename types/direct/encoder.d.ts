export function encode(value: any): number[];
export function encoder({ byteOffset }?: {
    byteOffset?: number;
}): (value: any, buffer: SharedArrayBuffer) => number;
export type Cache = Map<number, number[]>;

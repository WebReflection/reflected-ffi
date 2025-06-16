export function encode(value: any): number[];
export function encoder({ byteOffset, splitViews }?: {
    byteOffset?: number;
    splitViews?: boolean;
}): (value: any, buffer: SharedArrayBuffer) => number;
export type Cache = Map<number, number[]>;

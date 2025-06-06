export function fromBuffer(args: [number[], number]): ArrayBufferLike;
export function fromView([name, args, byteOffset, length]: [string, [number[], number], number, number]): any;
export function toBuffer(value: ArrayBufferLike): [number[], number];
export function toView(value: ArrayBufferView): [string, [number[], number], number, number];

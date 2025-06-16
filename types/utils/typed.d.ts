export function fromBuffer([value, maxByteLength]: BufferDetails, direct: boolean): ArrayBufferLike;
export function fromView([name, args, byteOffset, length]: ViewDetails, direct: boolean): any;
export function toBuffer(value: ArrayBufferLike, direct: boolean): BufferDetails;
export function toView(value: ArrayBufferView, direct: boolean): ViewDetails;
export type BufferDetails = [ArrayBufferLike | number[], number];
export type ViewDetails = [string, BufferDetails, number, number];

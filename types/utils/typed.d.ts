export function arrayBuffer(length: any, maxByteLength: any, value: any): ArrayBuffer;
export function fromBuffer([value, maxByteLength]: BufferDetails): ArrayBufferLike;
export function fromView([name, args, byteOffset, length]: ViewDetails): any;
export function toBuffer(value: ArrayBufferLike, direct: boolean): BufferDetails;
export function toView(value: ArrayBufferView, direct: boolean): ViewDetails;
export type BufferDetails = [Uint8Array<ArrayBufferLike> | number[], number];
export type ViewDetails = [string, BufferDetails, number, number];

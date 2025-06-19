export class Array extends ArrayBuffer {
    value: any;
    transferToFixedLength(length: any): ArrayBuffer;
}
export class Buffer extends Stack {
    /**
     * @param {ArrayBuffer} buffer
     * @param {number} offset
     */
    constructor(buffer: ArrayBuffer, offset: number);
    /** @private */
    private e;
    sync(last: any): this;
}
import Stack from './array.js';

export default class BufferedArray {
    /**
     * @param {BufferedArray} self
     * @param {Uint8Array} value
     */
    static push(self: BufferedArray, value: Uint8Array): void;
    /**
     * @param {SharedArrayBuffer} buffer
     * @param {number} offset
     */
    constructor(buffer: SharedArrayBuffer, offset: number);
    /** @private length */
    private l;
    /** @private view */
    private v;
    /** @private output */
    private o;
    /** @type {typeof Array.prototype.push} */
    push: typeof Array.prototype.push;
    get length(): number;
    /**
     * commit values
     * @private
     */
    private c;
    /**
     * grow the buffer
     * @private
     * @param {number} byteLength
     * @returns {number}
     */
    private g;
}

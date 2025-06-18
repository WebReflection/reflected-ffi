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
    /** @private output */
    private o;
    /** @private view */
    private v;
    /** @type {typeof Array.prototype.push} */
    push: typeof Array.prototype.push;
    get length(): number;
    /**
     * Sync all entries in the output to the buffer.
     * @param {boolean} end `true` if it's the last sync.
     * @returns
     */
    sync(end: boolean): this;
    /**
     * Set a value to the buffer
     * @private
     * @param {Uint8Array|number[]} value
     * @param {number} byteLength
     */
    private _;
}

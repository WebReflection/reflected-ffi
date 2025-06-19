export default class Stack {
    /**
     * @param {Stack} self
     * @param {Uint8Array} value
     */
    static push(self: Stack, value: Uint8Array): void;
    /**
     * @param {ArrayBufferLike} buffer
     * @param {number} offset
     */
    constructor(buffer: ArrayBufferLike, offset: number);
    /** @private length */
    private l;
    /** @private output */
    private o;
    /** @private view */
    private v;
    /** @type {typeof Array.prototype.push} */
    push: typeof Array.prototype.push;
    /**
     * @readonly
     * @type {number}
     */
    readonly get length(): number;
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

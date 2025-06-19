// This is an Array facade for the encoder.

export default class Stack {
  /**
   * @param {Stack} self
   * @param {Uint8Array} value
   */
  static push(self, value) {
    self.sync(false);
    self._(value, value.length);
  }

  /**
   * @param {ArrayBufferLike} buffer
   * @param {number} offset
   */
  constructor(buffer, offset) {
    /** @type {number[]} */
    const output = [];

    /** @private length */
    this.l = 0;

    /** @private output */
    this.o = output;

    /** @private view */
    this.v = new Uint8Array(buffer, offset);

    /** @type {typeof Array.prototype.push} */
    this.push = output.push.bind(output);
  }

  /**
   * @readonly
   * @type {number}
   */
  get length() {
    return this.l + this.o.length;
  }

  /**
   * Sync all entries in the output to the buffer.
   * @param {boolean} last `true` if it's the last sync.
   */
  sync(last) {
    const output = this.o;
    const length = output.length;
    if (length) this._(last ? output : output.splice(0), length);
  }

  /**
   * Set a value to the buffer
   * @private
   * @param {Uint8Array|number[]} value
   * @param {number} byteLength
   */
  _(value, byteLength) {
    const { buffer, byteOffset } = this.v;
    const offset = this.l;
    this.l += byteLength;
    byteLength += byteOffset + offset;
    if (buffer.byteLength < byteLength)
      /** @type {SharedArrayBuffer} */(buffer).grow(byteLength);
    this.v.set(value, offset);
  }
}

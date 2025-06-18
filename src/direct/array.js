export default class BufferedArray {
  /**
   * @param {BufferedArray} self
   * @param {Uint8Array} value
   */
  static push(self, value) {
    self.c();
    self.v.set(value, self.g(value.length));
  }

  /**
   * @param {SharedArrayBuffer} buffer
   * @param {number} offset
   */
  constructor(buffer, offset) {
    /** @type {number[]} */
    const output = [];

    /** @private length */
    this.l = 0;

    /** @private view */
    this.v = new Uint8Array(buffer, offset);

    /** @private output */
    this.o = output;

    /** @type {typeof Array.prototype.push} */
    this.push = output.push.bind(output);
  }

  get length() {
    return this.o.length + this.l;
  }

  get end() {
    this.c();
    return this.l;
  }

  /**
   * commit values
   * @private
   */
  c() {
    const output = this.o;
    const length = output.length;
    if (length) this.v.set(output.splice(0), this.g(length));
  }

  /**
   * grow the buffer
   * @private
   * @param {number} byteLength
   * @returns {number}
   */
  g(byteLength) {
    const { buffer, byteOffset } = this.v;
    const length = this.l;
    this.l += byteLength;
    byteLength += byteOffset + length;
    //@ts-ignore
    if (buffer.byteLength < byteLength) buffer.grow(byteLength);
    return length;
  }
}

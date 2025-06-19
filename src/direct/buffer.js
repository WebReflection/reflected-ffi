import Stack from './array.js';

export class Array extends ArrayBuffer {
  value;
  transferToFixedLength(length) {
    return (this.value = new ArrayBuffer(length));
  }
}

//@ts-ignore
export class Buffer extends Stack {
  /**
   * @param {ArrayBuffer} buffer
   * @param {number} offset
   */
  constructor(buffer, offset) {
    super(buffer, offset);
    /** @private */
    this.e = [];
  }

  sync(end) {
    super.sync(end);
    if (end) {
      const entries = this.e;
      //@ts-ignore
      const length = this.l;
      //@ts-ignore
      const offset = this.v.byteOffset;
      //@ts-ignore
      const buffer = this.v.buffer.transferToFixedLength(length + offset);
      //@ts-ignore
      this.v = new Uint8Array(buffer, offset);
      for (let l = 0, i = 0; i < entries.length; i++) {
        const data = entries[i];
        //@ts-ignore
        this.v.set(data, l);
        l += data.length;
      }
      //@ts-ignore
      this.o.length = 0;
    }
    return this;
  }

  /**
   * Set a value to the buffer
   * @private
   * @param {Uint8Array|number[]} value
   * @param {number} byteLength
   */
  _(value, byteLength) {
    //@ts-ignore
    this.l += byteLength;
    this.e.push(value);
  }
}

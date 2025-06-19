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

  sync(last) {
    super.sync(last);
    if (last) {
      //@ts-ignore
      const length = this.l;
      //@ts-ignore
      const offset = this.v.byteOffset;
      //@ts-ignore
      const buffer = this.v.buffer.transferToFixedLength(length + offset);
      //@ts-ignore
      const view = new Uint8Array(buffer, offset);
      for (let entries = this.e, l = 0, i = 0; i < entries.length; i++) {
        const data = entries[i];
        //@ts-ignore
        view.set(data, l);
        l += data.length;
      }
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

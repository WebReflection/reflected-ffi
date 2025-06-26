/**
 * @param {number} timeout
 * @returns {typeof import('../ts/memo.js').Memo}
 */
export default timeout => {
  const entries = [];

  const drop = i => {
    const cached = entries.splice(i);
    while (i < cached.length)
      cached[i++].delete(cached[i++]);
  };

  const set = (self, key) => {
    if (entries.push(self, key) < 3)
      setTimeout(drop, timeout, 0);
  };

  return class Memo extends Map {
    static keys = Symbol();
    static proto = Symbol();

    drop(key, value) {
      if (key !== Memo.proto) super.delete(Memo.keys);
      super.delete(key);
      return value;
    }

    set(key, value) {
      set(super.set(key, value), key);
      return value;
    }
  }
};

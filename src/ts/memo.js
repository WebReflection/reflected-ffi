// pointless file used to describe the returned Memo class
export class Memo extends Map {
  static keys = Symbol();
  static proto = Symbol();

  /**
   * @template V
   * @param {string|symbol} key
   * @param {V} value
   * @returns {V}
   */
  drop(key, value) {
    return value;
  }

  /**
   * @template V
   * @param {string|symbol} key
   * @param {V} value
   * @returns {V}
   */
  set(key, value) {
    return value;
  }
}

/**
 * @template T
 * @typedef {Object} Heap
 * @property {() => void} clear
 * @property {(ref:T) => number} id
 * @property {(id:number) => T} ref
 * @property {(id:number) => boolean} unref
 */

/**
 * Create a heap-like utility to hold references in memory.
 * @param {number} [id=0] The initial `id` which is `0` by default.
 * @param {Map<number, any>} [ids=new Map] The used map of ids to references.
 * @param {Map<any, number>} [refs=new Map] The used map of references to ids.
 * @returns {Heap<any>}
 */
export default (id = 0, ids = new Map, refs = new Map) => ({
  clear: () => {
    ids.clear();
    refs.clear();
  },
  id: ref => {
    let uid = refs.get(ref);
    if (uid === void 0) {
      /* c8 ignore next */
      while (ids.has(uid = id++));
      ids.set(uid, ref);
      refs.set(ref, uid);
    }
    return uid;
  },
  ref: id => ids.get(id),
  unref: id => {
    refs.delete(ids.get(id));
    return ids.delete(id);
  },
});

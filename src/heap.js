export const heap = ($ = 0, ids = new Map, refs = new Map) => ({
  ref: id => ids.get(id),
  id: ref => {
    let uid = refs.get(ref);
    if (uid === void 0) {
      /* c8 ignore next */
      while (ids.has(uid = $++));
      ids.set(uid, ref);
      refs.set(ref, uid);
    }
    return uid;
  },
  unref: id => {
    refs.delete(ids.get(id));
    return ids.delete(id);
  },
});

export const shared = heap();

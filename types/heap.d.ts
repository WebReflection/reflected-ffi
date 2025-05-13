declare function _default(id?: number, ids?: Map<number, any>, refs?: Map<any, number>): {
    /**
     * Clear the heap.
     */
    clear: () => void;
    /**
     * Get the id of a reference.
     * @param {any} ref
     * @returns {number}
     */
    id: (ref: any) => number;
    /**
     * Get the reference of an id.
     * @param {number} id
     * @returns {any}
     */
    ref: (id: number) => any;
    /**
     * Unref an id.
     * @param {number} id
     * @returns {boolean}
     */
    unref: (id: number) => boolean;
};
export default _default;
export type Heap<T> = {
    clear: () => void;
    id: (ref: T) => number;
    ref: (id: number) => T;
    unref: (id: number) => boolean;
};

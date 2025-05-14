declare function _default(id?: number, ids?: Map<number, any>, refs?: Map<any, number>): Heap<any>;
export default _default;
export type Heap<T> = {
    clear: () => void;
    id: (ref: T) => number;
    ref: (id: number) => T;
    unref: (id: number) => boolean;
};

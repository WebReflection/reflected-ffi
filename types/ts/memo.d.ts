export class Memo extends Map<any, any> {
    static keys: symbol;
    static proto: symbol;
    constructor();
    constructor(entries?: readonly (readonly [any, any])[]);
    constructor();
    constructor(iterable?: Iterable<readonly [any, any]>);
    /**
     * @template V
     * @param {string|symbol} key
     * @param {V} value
     * @returns {V}
     */
    drop<V>(key: string | symbol, value: V): V;
    /**
     * @template V
     * @param {string|symbol} key
     * @param {V} value
     * @returns {V}
     */
    set<V>(key: string | symbol, value: V): V;
}

declare function _default({ reflect, transform, released, buffer, timeout, }?: RemoteOptions): {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global: unknown;
    isProxy: (value: any) => boolean;
    assign<T extends {}, U>(target: T, source: U): T & U;
    assign<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
    assign<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
    assign(target: object, ...sources: any[]): any;
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct<T extends WeakKey>(value: T): T;
    /**
     * Evaluates elsewhere the given callback with the given arguments.
     * This utility is similar to puppeteer's `page.evaluate` where the function
     * content is evaluated in the local side and its result is returned.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback: Function, ...args: any[]) => any;
    /**
     * @param {object} target
     * @param  {...(string|symbol)} keys
     * @returns {any[]}
     */
    gather(target: object, ...keys: (string | symbol)[]): any[];
    /**
     * Queries the given target for the given path.
     * @param {any} target
     * @param {string} path
     * @returns {any}
     */
    query: (target: any, path: string) => any;
    /**
     * The callback needed to resolve any local call. Currently only `apply` and `unref` are supported.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method: number, uid: number | null, ...args: any[]) => Promise<any>;
};
export default _default;
/**
 * Optional utilities used to orchestrate local <-> remote communication.
 */
export type RemoteOptions = {
    /**
     * The function used to reflect operations via the remote receiver. All `Reflect` methods + `unref` are supported.
     */
    reflect?: Function;
    /**
     * The function used to transform local values into simpler references that the remote side can understand.
     */
    transform?: Function;
    /**
     * The function invoked when a reference is released.
     */
    released?: Function;
    /**
     * Optionally allows direct buffer deserialization breaking JSON compatibility.
     */
    buffer?: boolean;
    /**
     * Optionally allows remote values to be cached when possible for a `timeout` milliseconds value. `-1` means no timeout.
     */
    timeout?: number;
};

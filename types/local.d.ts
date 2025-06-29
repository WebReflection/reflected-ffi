declare function _default({ reflect, transform, remote, module, buffer, timeout, }?: LocalOptions): {
    assign: {
        <T extends {}, U>(target: T, source: U): T & U;
        <T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
        <T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
        (target: object, ...sources: any[]): any;
    };
    gather: (target: any, ...keys: (string | symbol)[][]) => any[];
    query: (target: any, path: string) => any;
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct<T extends WeakKey>(value: T): T;
    /**
     * Provide a portable API that just invokes the given callback with the given arguments.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback: Function, ...args: any[]) => any;
    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect(method: number, uid: number | null, ...args: any[]): any;
    /**
     * Terminates the local side of the communication,
     * erasing and unregistering all the cached references.
     */
    terminate(): void;
};
export default _default;
/**
 * Optional utilities used to orchestrate local <-> remote communication.
 */
export type LocalOptions = {
    /**
     * The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
     */
    reflect?: Function;
    /**
     * The function used to transform local values into simpler references that the remote side can understand.
     */
    transform?: Function;
    /**
     * The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
     */
    remote?: Function;
    /**
     * The function used to import modules when remote asks to `import(...)` something.
     */
    module?: Function;
    /**
     * Optionally allows direct buffer serialization breaking JSON compatibility.
     */
    buffer?: boolean;
    /**
     * Optionally allows remote values to be cached when possible for a `timeout` milliseconds value. `-1` means no timeout.
     */
    timeout?: number;
};

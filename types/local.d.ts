declare function _default({ reflect, transform, remote, module, }?: LocalOptions): {
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct<T extends WeakKey>(value: T): T;
    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {string} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method: string, uid: number | null, ...args: any[]) => any;
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
};

declare function _default({ reflect, transform, }?: RemoteOptions): {
    /**
     * The local global proxy reference.
     * @type {unknown}
     */
    global: unknown;
    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct<T extends WeakKey>(value: T): T;
    /**
     * The callback needed to resolve any local call. Currently only `apply` and `unref` are supported.
     * Its returned value will be understood by the remote implementation
     * and it is compatible with the structured clone algorithm.
     * @param {string} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect: (method: string, uid: number | null, ...args: any[]) => any;
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
};

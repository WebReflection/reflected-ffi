export function heap($?: number, ids?: Map<any, any>, refs?: Map<any, any>): {
    ref: (id: any) => any;
    id: (ref: any) => any;
    unref: (id: any) => boolean;
};
export namespace shared {
    function ref(id: any): any;
    function id(ref: any): any;
    function unref(id: any): boolean;
}

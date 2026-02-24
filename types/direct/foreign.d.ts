export class ForeignArray extends Array<any> {
    constructor(arrayLength?: number);
    constructor(arrayLength: number);
    constructor(...items: any[]);
}
export class ForeignSet extends Set<any> {
    constructor(values?: readonly any[]);
    constructor(iterable?: Iterable<any>);
}

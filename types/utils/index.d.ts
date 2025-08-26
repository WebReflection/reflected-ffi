export const defineProperty: <T>(o: T, p: PropertyKey, attributes: PropertyDescriptor & ThisType<any>) => T;
export const assign: {
    <T extends {}, U>(target: T, source: U): T & U;
    <T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
    <T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
    (target: object, ...sources: any[]): any;
};
export const fromArray: {
    <T>(arrayLike: ArrayLike<T>): T[];
    <T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
    <T>(iterable: Iterable<T> | ArrayLike<T>): T[];
    <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
};
export const isArray: (arg: any) => arg is any[];
export const isView: (arg: any) => arg is ArrayBufferView;
export function tv(type: number, value: any): TypeValue;
export function identity(value: any): any;
export const array: any[];
export const object: {};
export function callback(): void;
export function loopValues(asValue: (value: any, cache?: Map<any, any>) => any): (arr: any[], cache?: Map<any, any>) => any[];
export function fromKey([type, value]: TypeValue): string | symbol;
export function toKey(value: string | symbol): TypeValue;
export function push(output: number[], value: Uint8Array): void;
/**
 * A type/value pair.
 */
export type TypeValue = [number, any];

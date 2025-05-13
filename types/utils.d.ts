export const isArray: (arg: any) => arg is any[];
export const isView: (arg: any) => arg is ArrayBufferView;
export function _$(type: number, value: any): TypeValue;
export function identity(value: any): any;
export function loopValues(asValue: (value: any, cache?: Map<any, any>) => any): (arr: any[], cache?: Map<any, any>) => any[];
export function fromKey([type, value]: TypeValue): string | symbol;
export function toKey(value: string | symbol): TypeValue;
export function fromSymbol(name: string): symbol;
export function toSymbol(value: symbol): string;
/**
 * A type/value pair.
 */
export type TypeValue = [number, any];

export const DIRECT           = 0;
export const REMOTE           = 1 << 0;
export const OBJECT           = 1 << 1;
export const ARRAY            = 1 << 2;
export const FUNCTION         = 1 << 3;
export const SYMBOL           = 1 << 4;
export const BIGINT           = 1 << 5;
export const BUFFER           = 1 << 6;
export const STRING           = 1 << 7;
export const ERROR            = (1 << 8) + ~REMOTE;

export const VIEW             = BUFFER | ARRAY;
export const REMOTE_OBJECT    = REMOTE | OBJECT;
export const REMOTE_ARRAY     = REMOTE | ARRAY;
export const REMOTE_FUNCTION  = REMOTE | FUNCTION;

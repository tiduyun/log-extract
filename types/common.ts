export interface Kv<T = any> {
  [k: string]: T
}

export type GenericCallback = <T> (error?: Error | null, data?: T) => void;
export interface Kv<T = any> {
  [k: string]: T
}

export type GenericCallback = <T> (error?: Error | null, data?: T) => void;

export interface TransformStream<I = any, O = any> {
  readonly readable: ReadableStream<O>;
  readonly writable: WritableStream<I>;
}

export interface IProject {
  title: string;
  api: string;
}

export interface IConfig {
  cookie: string;
  projects: Kv<IProject>;
  /* [Category, Array<LexiconWord>] */
  departmentNames: Array<[string, string[]]>;
}

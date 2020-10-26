export type Func = () => any;
export type AnyFunc = (...args: any[]) => any;
export type SimpleAyncFunc = () => Promise<void> | void;
export type Filter<T> = (item: T, index?: number) => boolean;
export type Mapper<T> = (a: T) => T;

export interface PromiseHandle {
  resolve: (result?: any) => void;
  reject: (error: Error) => void;
}

export interface AsyncIterator {
  next: () => Promise<{value: any, done: boolean}> | {value: any, done: boolean};
}

export type IteratorOrList = AsyncIterator | any[];

export type OnOneDone = (r: any, success: number, fail: number, total: number) => void;
export type OnError = (err: Error, success: number, fail: number, total: number) => void;
export type OnAllDone = (success: number, fail: number, total: number) => void;

export interface Monitor {
  onProgress: OnOneDone;
  onError: OnError;
  onDone: OnAllDone;
}

export type Job = Partial<Monitor> & AnyFunc;

export function isIterator(list: IteratorOrList): list is AsyncIterator {
  if (!!(list as AsyncIterator).next) {
    return true;
  } else {
    return false;
  }
}

export function createPromiseHandle(): [Promise<any>, PromiseHandle] {
  const handle: PromiseHandle = {} as any;
  const promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return [promise, handle];
}

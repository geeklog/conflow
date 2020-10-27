import { PromiseHandle } from './types';

export function usePromise<T>(): PromiseHandle<T> {
  let resolve: ((result?: T) => void);
  let reject: ((error: Error) => void);
  let wait: () => Promise<T>;
  const p = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });
  resolve = resolve!;
  reject = reject!;
  wait = async () => await p;
  return {
    resolve,
    reject,
    wait
  };
}

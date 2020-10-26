import { sleep } from './sleep';
import { AnyFunc } from './types';

function getter<T>(op: (() => T) | T) {
  return () => {
    if (typeof op === 'function') {
      return (op as AnyFunc)();
    } else {
      return op;
    }
  };
}

export function retry(fn: AnyFunc, options: {times: number, interval: number|(() => number)}) {
  return async () => {
    if (!options) {
      return await fn();
    }

    const errors = [];
    const { times, interval } = options;
    const getInterval = getter(interval);

    for (let i = 0; i < times + 1; i++) {
      try {
        return await fn();
      } catch (err) {
        errors.push(err);
        const ival = getInterval() || 0;
        if (ival > 0) {
          await sleep(ival);
        }
      }
    }
    throw errors[errors.length - 1];
  };
}

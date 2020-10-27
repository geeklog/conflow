import { SimpleAyncFunc, AnyFunc } from './types';

export * from './types';
export * from './concurrent';
export * from './sequential';
export * from './promise';
export * from './sleep';
export * from './delay';
export * from './pipe';
export * from './retry';
export * from './workers';

export function run(fn: any, ...args: any[]) {
  fn(...args);
}

export function setLimitedInterval(
  fn: (...args: any[]) => any,
  timeout: number,
  limit: number,
  ...params: any[]
) {
  let i = 0;
  const handler: NodeJS.Timeout = setInterval((...args) => {
    i++;
    if (i > limit) {
      return clearInterval(handler);
    }
    fn(...args);
  }, timeout, ...params);
  return handler;
}

export async function trycatch(fn: SimpleAyncFunc) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
  }
}

export async function filterSeq(this: any[], fn: AnyFunc) {
  const arr = [];
  for (let i = 0; i < this.length; i++) {
    const r = await fn(this[i], i, this);
    if (r) {
      arr.push(this[i]);
    }
  }
  return arr;
}

export async function mapSeq(this: any[], fn: AnyFunc) {
  const arr = [];
  for (let i = 0; i < this.length; i++) {
    arr.push(await fn(this[i], i, this));
  }
  return arr;
}

export async function forEachSeq(this: any[], fn: AnyFunc) {
  for (let i = 0; i < this.length; i++) {
    await fn(this[i], i, this);
  }
}

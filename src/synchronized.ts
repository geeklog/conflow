import { AsyncFunction, PromiseHandle } from './types';
import { usePromise } from './promise';

interface AsyncContext extends Partial<PromiseHandle<any>> {
  args: any[];
}

interface AsyncExecutor {
  started: boolean;
  queue: AsyncContext[];
  func: AsyncFunction;
  bindedThis: object | null;
}

async function next(exe: AsyncExecutor, ctx: AsyncContext) {
  if (exe.started) {
    const {wait, resolve, reject} = usePromise<any>();
    ctx.wait = ctx.wait || wait;
    ctx.resolve = ctx.resolve || resolve;
    ctx.reject = ctx.reject || reject;
    exe.queue.push(ctx);
    return await ctx.wait();

  } else {
    exe.started = true;

    let error: Error | null = null;
    let res: any;
    try {
      res = await exe.func.apply(exe.bindedThis, ctx.args);
    } catch (err) {
      error = err;
    }

    exe.started = false;

    const nextCtx = exe.queue.shift();
    if (nextCtx) {
      next(exe, nextCtx);
    }

    if (error) {
      if (ctx.reject) {
        ctx.reject(error);
      } else {
        throw error;
      }
    }

    if (ctx.resolve) {
      ctx.resolve(res);
    } else {
      return res;
    }

  }
}

export default function synchronized(type: 'queued' | 'discard' | 'throw' = 'queued') {
  return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
    const func = descriptor.value;
    func.__exec__ = {
      started: false,
      queue: [],
      func,
      bindedThis: null
    } as AsyncExecutor;
    descriptor.value = async function(...args: any[]) {
      func.__exec__.bindedThis = this;
      return await next(func.__exec__, {args});
    };
  };
}

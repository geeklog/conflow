type Func = () => any;
type AnyFunc = (...args: any[]) => any;

interface Options {
  onErrorOccur?: 'skip' | 'break';
  suppressError?: boolean;
  preserveOrder?: boolean;
}

interface AsyncIterator {
  next: () => Promise<{value: any, done: boolean}> | {value: any, done: boolean};
}

type IteratorOrList = AsyncIterator | any[];

function isIterator(list: IteratorOrList): list is AsyncIterator {
  if (!!(list as AsyncIterator).next) {
    return true;
  } else {
    return false;
  }
}

type OnOneDone = (r: any, success: number, fail: number, total: number) => void;
type OnError = (err: Error, success: number, fail: number, total: number) => void;
type OnAllDone = (success: number, fail: number, total: number) => void;

interface Monitor {
  onProgress: OnOneDone;
  onError: OnError;
  onDone: OnAllDone;
}

interface PromiseHandle {
  resolve: (result?: any) => void;
  reject: (error: Error) => void;
}

export type Job = Partial<Monitor> & AnyFunc;

function createPromiseHandle(): [Promise<any>, PromiseHandle] {
  const handle: PromiseHandle = {} as any;
  const promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return [promise, handle];
}

export class Concurrent {

  private success = 0;
  private fail = 0;
  private total = 0;
  private waitingQueue: Array<[Func, number, PromiseHandle]> = [];
  private execQueue: Array<'wait'|'running'|'fail'|'done'> = [];
  private resultQueue: any[] = [];
  private runningCount = 0;
  private limit: number = 0;
  private onErrorOccur?: 'skip' | 'break';
  private halt = false;
  private onOneDone ?: OnOneDone;
  private onError ?: OnError;
  private onAllDone ?: OnAllDone;
  private supressError: boolean = false;
  private preserveOrder: boolean = false;
  private idleHandlers: PromiseHandle[] = [];

  constructor(limit: number, options?: Options) {
    this.onErrorOccur = options && options.onErrorOccur || 'skip';
    this.preserveOrder = options?.preserveOrder || false;
    this.limit = limit;
  }

  go(fn: Func) {
    const [promise, handle] = createPromiseHandle();
    this.waitingQueue.push([fn, this.total, handle]);
    this.execQueue[this.total] = 'wait';
    this.total ++;
    this.next();
    return promise;
  }

  one(callback: OnOneDone) {
    this.onOneDone = callback;
  }

  done(callback: OnAllDone) {
    this.onAllDone = callback;
  }

  error(callback: OnError) {
    this.onError = callback;
  }

  idle(): Promise<{success: number, fail: number, total: number}> {
    if (this.runningCount < this.limit) {
      return Promise.resolve({
        success: this.success, fail: this.fail, total: this.total
      });
    }
    const [promise, handler] = createPromiseHandle();
    this.idleHandlers.push(handler);
    return promise;
  }

  async forEach(list: IteratorOrList, fn: (n: any) => void | Promise<void>) {
    if (isIterator(list)) {
      let n = await list.next();
      this.go(() => fn(n.value));
      while (!n.done) {
        this.go(() => fn(n.value));
        await this.idle();
        n = await list.next();
      }
    } else {
      for (const a of list) {
        this.go(() => fn(a));
      }
    }
  }

  finish(): Promise<{success: number, fail: number, total: number}> {
    return new Promise((resolve) => {
      this.done((success: number, fail: number, total: number) =>
        resolve({success, fail, total})
      );
    });
  }

  private async next() {
    if (this.halt) {
      return;
    }
    if (this.runningCount > this.limit) {
      return;
    }
    while (this.runningCount < this.limit) {
      const exec = this.waitingQueue.shift();
      if (!exec) {
        break;
      }
      const [fn, i, promise] = exec;
      this.call(fn, i, promise);
    }
    if (this.runningCount < this.limit) {
      for (const idleHandle of this.idleHandlers) {
        idleHandle.resolve({success: this.success, fail: this.fail, total: this.total});
      }
    }
  }

  private async call(fn: Func, curr: number, promise: PromiseHandle) {
    if (this.halt) {
      return;
    }

    this.runningCount++;

    try {
      this.execQueue[curr] = 'running';
      const currResult = await fn();
      promise.resolve(currResult);
      this.execQueue[curr] = 'done';
      if (this.preserveOrder) {
        this.resultQueue[curr] = currResult;
        let waitingPrevious = false;
        for (let i = 0; i < curr; i++) {
          if (this.execQueue[i] === 'running') {
            waitingPrevious = true;
            break;
          }
        }
        if (!waitingPrevious) {
          for (let i = curr; i < this.total; i++) {
            if (this.execQueue[i] === 'running') {
              break;
            }
            const r = this.resultQueue[i];
            if (this.execQueue[i] === 'done' && (r !== undefined)) {
              this.resultQueue[i] = undefined;
              this.success ++;
              this.onOneDone && this.onOneDone(r, this.success, this.fail, this.total);
            }
          }
        }
      } else {
        this.success ++;
        this.onOneDone && this.onOneDone(currResult, this.success, this.fail, this.total);
      }
    } catch (error) {
      this.fail ++;
      this.execQueue[curr] = 'fail';
      if (this.onError) {
        this.onError(error, this.success, this.fail, this.total);
      } else if (!this.supressError) {
        console.error(`Unhandle Error:`, error);
      }
      if (this.onErrorOccur === 'break') {
        this.halt = true;
      }
      promise.reject(error);
    }

    this.runningCount--;

    if (this.halt) {
      return;
    }

    if (this.waitingQueue.length === 0 && this.runningCount === 0 && !this.idleHandlers.length) {
      this.onAllDone && this.onAllDone(this.success, this.fail, this.total);
    } else {
      this.next();
    }
  }

}

export const concurrentAll = (
  n: number,
  vals: any[] = [],
  fn: (item: any) => Promise<any> = async (item: any) => item
) => {
  const q = concurrent(n, {preserveOrder: true});
  for (const v of vals) {
    q.go(fn.bind(null, v));
  }
  return q;
};

export default function concurrent(limit: number, options?: Options) {
  return new Concurrent(limit, options);
}

class PinelineRunner {

  job: Job;
  concurr: number;
  flatten: boolean;
  all: any[];
  q: Concurrent;

  constructor(
    {job, concurr, flatten, all}: {job: Job, concurr: number, flatten: boolean, all: any[]}
  ) {
    this.job = job;
    this.concurr = concurr;
    this.flatten = flatten;
    this.all = all;
    this.q = concurrent(concurr);
    if (job.onProgress) {
      this.q.one(job.onProgress);
    }
    if (job.onError) {
      this.q.error(job.onError);
    }
    if (job.onDone) {
      this.q.done(job.onDone);
    }
  }

  async start(...args: any[]) {
    if (this.flatten) {
      for (const arg of args[0]) {
        this.q.go(async () => {
          await this.job(arg, (...nextArgs: any[]) => {
            const next = this.all[this.all.indexOf(this) + 1];
            next.start(...nextArgs);
          });
        });
      }
    } else {
      this.q.go(async () => {
        await this.job(...args, (...nextArgs: any[]) => {
          const next = this.all[this.all.indexOf(this) + 1];
          next.start(...nextArgs);
        });
      });
    }
  }

}

export class Pipeline {

  runners: PinelineRunner[];

  constructor() {
    this.runners = [];
  }

  pipe(job: Job, concurr= 1) {
    this.runners.push(new PinelineRunner({
      job,
      concurr,
      all: this.runners,
      flatten: false
    }));
    return this;
  }

  pipeAll(job: Job, concurr= 1) {
    this.runners.push(new PinelineRunner({
      job,
      concurr,
      flatten: true,
      all: this.runners
    }));
    return this;
  }

  start(job: Job, concurr= 1) {
    this.runners.unshift(new PinelineRunner({
      job,
      concurr,
      flatten: false,
      all: this.runners
    }));
    setTimeout(() => {
      this.runners[0].start();
    }, 0);
    return this;
  }

}
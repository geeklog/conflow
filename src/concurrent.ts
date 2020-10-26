import {
  createPromiseHandle,
  Func,
  isIterator,
  IteratorOrList,
  OnAllDone,
  OnError,
  OnOneDone,
  PromiseHandle
} from "./types";

interface Options {
  onErrorOccur?: 'skip' | 'break';
  preserveOrder?: boolean;
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
        n = await list.next();
        this.go(() => fn(n.value));
        await this.idle();
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

export function concurrent(limit: number, options?: Options) {
  return new Concurrent(limit, options);
}

export function concurrentAll(
  n: number,
  vals: any[] = [],
  fn: (item: any) => Promise<any> = async (item: any) => item
) {
  const q = concurrent(n, {preserveOrder: true});
  for (const v of vals) {
    q.go(fn.bind(null, v));
  }
  return q;
}

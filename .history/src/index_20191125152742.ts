type Func = () => any;

interface Options {
  onErrorOccur?: 'skip' | 'break';
  suppressError?: boolean;
}

type OnOneDone = (r: any, success: number, fail: number, total: number) => void;
type OnError = (err: Error, success: number, fail: number, total: number) => void;
type OnAllDone = (success: number, fail: number, total: number) => void;

export class Concurrent {

  private success = 0;
  private fail = 0;
  private total = 0;
  private exeQueue: Func[] = [];
  private runningCount = 0;
  private limit: number = 0;
  private onErrorOccur?: 'skip' | 'break';
  private halt = false;
  private onOneDone ?: OnOneDone;
  private onError ?: OnError;
  private onAllDone ?: OnAllDone;
  private supressError: boolean = false;

  constructor(limit: number, options?: Options) {
    this.onErrorOccur = options && options.onErrorOccur || 'skip';
    this.limit = limit;
  }

  go(fn: Func) {
    this.total ++;
    this.exeQueue.push(fn);
    this.next();
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

  private async next() {
    if (this.halt) {
      return;
    }
    if (this.runningCount > this.limit) {
      return;
    }
    while (this.runningCount < this.limit) {
      const fn = this.exeQueue.shift();
      if (!fn) {
        break;
      }
      this.call(fn);
    }
  }

  private async call(fn: Func) {
    if (this.halt) {
      return;
    }

    this.runningCount++;

    try {
      const r = await fn();
      this.success ++;
      this.onOneDone && this.onOneDone(r, this.success, this.fail, this.total);
    } catch (error) {
      this.fail ++;
      if (this.onError) {
        this.onError(error, this.success, this.fail, this.total);
      } else if (!this.supressError) {
        console.error(`Unhandle Error:`, error);
      }
      if (this.onErrorOccur === 'break') {
        this.halt = true;
        return;
      }
    }

    this.runningCount--;

    if (this.halt) {
      return;
    }

    if (this.exeQueue.length === 0) {
      this.onAllDone && this.onAllDone(this.success, this.fail, this.total);
    } else {
      this.next();
    }
  }

}

export default function concurrent(limit: number, options?: Options) {
  return new Concurrent(limit, options);
}

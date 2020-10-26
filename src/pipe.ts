import { Job } from "./types";
import { Concurrent } from './concurrent';
import concurrent from './concurrent';

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

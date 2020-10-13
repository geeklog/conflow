import concurr from '../src/index';

const q = concurr(10, {preserveOrder: true});

const yieldNumber = (n: number, delayMillseconds: number) => () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(n), delayMillseconds);
  });
};

async function test() {
  let i = 0;
  while (true) {
    q.go(async () => {
      i += 1;
      const n = await yieldNumber(i, 1000 + Math.random() * 500)();
      console.log(n);
    });
    await q.idle();
  }
}

test();

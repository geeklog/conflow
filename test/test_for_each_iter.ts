import concurr from '../src/index';

const sleep = (millseconds?: number) => new Promise((resolve) => setTimeout(() => resolve(), millseconds));

function infiniteNumber() {
  let i = 0;
  return {
    async next() {
      let result: {value: number, done: boolean};
      result = {
        value: i,
        done: false
      };
      i += 1;
      return result;
    }
  };
}

async function test() {
  const q = concurr(3, {preserveOrder: true});
  q.forEach(infiniteNumber(), async n => {
    await sleep(1000);
    console.log(n);
  });
}

test();

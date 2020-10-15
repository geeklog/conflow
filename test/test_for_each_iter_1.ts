import concurr from '../src/index';

const sleep = (millseconds?: number) => new Promise((resolve) => setTimeout(() => resolve(), millseconds));

function onlyOne() {
  return {
    async next() {
      return {
        value: '1',
        done: true
      };
    }
  };
}

async function test() {
  const q = concurr(3, {preserveOrder: true});
  q.forEach(onlyOne(), async n => {
    await sleep(1000);
    console.log(n);
  });
}

test();

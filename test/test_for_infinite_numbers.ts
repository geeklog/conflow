import { concurrent, sleep } from '../src/index';

function infiniteNumber() {
  let i = 0;
  return {
    async next() {
      i += 1;
      const result: {value: number, done: boolean} = {
        value: i,
        done: false
      };
      return result;
    }
  };
}

async function test() {
  const q = concurrent(3, {preserveOrder: true});
  q.forEach(infiniteNumber(), async n => {
    await sleep(1000);
    console.log(n);
  });
}

test();

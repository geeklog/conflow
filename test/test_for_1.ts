import { concurrent, sleep } from '../src/index';

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
  const q = concurrent(3, {preserveOrder: true});
  q.forEach(onlyOne(), async n => {
    await sleep(1000);
    console.log(n);
  });
}

test();

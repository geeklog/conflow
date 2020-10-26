import { concurrent, delay } from '../src/index';

const q = concurrent(4);

function test() {
  q.go(delay(0, 5000));
  q.go(delay(1, 4000));
  q.go(delay(2, 3000));
  q.go(delay(3, 2000));
  q.go(delay(4, 1000));

  q.one((n) => console.log('one', n));
}

test();

import { concurrent, delay } from '../src/index';

const q = concurrent(4, {preserveOrder: true});

function test1() {
  q.go(delay(0, 2000));
  q.go(delay(1, 1000));
  q.go(delay(2, 3000));
  q.go(delay(3, 4000));
  q.go(delay(4, 0));

  q.one((n) => console.log('one', n));
  q.done(() => console.log('done'));
}

test1();

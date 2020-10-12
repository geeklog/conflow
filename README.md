## Usage example

```typescript
import concurr from 'concurr';

const q = concurr(4, {preserveOrder: true});

const yieldNumber = (n: number, delayMillseconds: number) => () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(n), delayMillseconds);
  });
};

function test1() {
  q.go(yieldNumber(0, 2000));
  q.go(yieldNumber(1, 1000));
  q.go(yieldNumber(2, 3000));
  q.go(yieldNumber(3, 4000));
  q.go(yieldNumber(4, 0));

  q.one((n) => console.log('done', n));
}

function test2() {
  q.go(yieldNumber(0, 5000));
  q.go(yieldNumber(1, 4000));
  q.go(yieldNumber(2, 3000));
  q.go(yieldNumber(3, 2000));
  q.go(yieldNumber(4, 1000));

  q.one((n) => console.log('done', n));
}

test2();
```
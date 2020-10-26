export function workers(strategy = 'fifo') {
  const works: any[] = [];
  const idles: any[] = [];

  if (strategy !== 'fifo' && strategy !== 'filo') {
    throw new Error(strategy);
  }

  const wks = {
    birth(o: any) {
      const idleIndex = idles.indexOf(o);
      if (idleIndex >= 0) {
        throw new Error('Already in idle queue');
      }
      const workingIndex = works.indexOf(o);
      if (workingIndex >= 0) {
        throw new Error('Already in working queue');
      }
      idles.push(o);
    },
    work(o: any) {
      const idleIndex = idles.indexOf(o);
      if (idleIndex >= 0) {
        idles.splice(idleIndex, 1);
      }
      const workingIndex = works.indexOf(o);
      if (workingIndex < 0) {
        works.push(o);
      }
    },
    retire(o: any) {
      const workingIndex = works.indexOf(o);
      if (workingIndex >= 0) {
        works.splice(workingIndex, 1);
      }
      const idleIndex = idles.indexOf(o);
      if (idleIndex < 0) {
        if (strategy === 'fifo') {
          idles.push(o);
        } else if (strategy === 'filo') {
          idles.unshift(o);
        }
      }
    },
    get workers() {
      return [...works];
    },
    get idlers() {
      return [...idles];
    },
    get: () => {
      const o: any = idles.pop();
      if (!o) { return null; }
      wks.work(o);
      return o;
    },
    get nWorkers() {
      return works.length;
    },
    get nIdles() {
      return idles.length;
    },
  };

  return wks;
}

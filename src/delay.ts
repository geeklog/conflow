export const delay = <T>(value: T, delayMillseconds: number) => () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMillseconds);
  });
};

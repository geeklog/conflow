export function sleep(timeout: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

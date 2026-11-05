export async function runWithLimit<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  let hasFailed = false;
  let firstError: unknown;

  async function runWorker() {
    while (nextIndex < items.length && !hasFailed) {
      const item = items[nextIndex];
      nextIndex += 1;
      try {
        await work(item);
      } catch (error) {
        if (!hasFailed) firstError = error;
        hasFailed = true;
      }
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  if (hasFailed) throw firstError;
}

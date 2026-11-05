export async function runWithLimit<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  let failure: { error: unknown } | null = null;

  async function runWorker() {
    while (nextIndex < items.length && !failure) {
      const item = items[nextIndex];
      nextIndex += 1;
      try {
        await work(item);
      } catch (error) {
        failure ??= { error };
      }
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  if (failure) throw (failure as { error: unknown }).error;
}

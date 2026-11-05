import { describe, expect, it } from "vitest";
import { runWithLimit } from "./run-with-limit";

function pause() {
  return new Promise((resolve) => setTimeout(resolve, 1));
}

describe("runWithLimit", () => {
  it("handles every item exactly once", async () => {
    const seen: number[] = [];
    await runWithLimit([1, 2, 3, 4, 5], 2, async (item) => {
      await pause();
      seen.push(item);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("never runs more than the limit at once, and does use the limit", async () => {
    let running = 0;
    let mostRunning = 0;
    await runWithLimit([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      running += 1;
      mostRunning = Math.max(mostRunning, running);
      await pause();
      running -= 1;
    });
    expect(mostRunning).toBe(3);
  });

  it("starts the next item as soon as any item finishes", async () => {
    const order: string[] = [];
    let finishSlow = () => {};
    const slow = new Promise<void>((resolve) => {
      finishSlow = resolve;
    });
    await runWithLimit(["slow", "fast", "next"], 2, async (item) => {
      order.push(`start ${item}`);
      if (item === "slow") await slow;
      if (item === "next") finishSlow();
    });
    expect(order).toEqual(["start slow", "start fast", "start next"]);
  });

  it("does nothing for an empty list", async () => {
    await expect(
      runWithLimit([], 3, async () => {
        throw new Error("should not run");
      }),
    ).resolves.toBeUndefined();
  });

  it("stops starting new items after a failure, waits for running ones, and rethrows", async () => {
    const finished: number[] = [];
    await expect(
      runWithLimit([1, 2, 3, 4, 5, 6], 2, async (item) => {
        if (item === 1) throw new Error("boom");
        await pause();
        finished.push(item);
      }),
    ).rejects.toThrow("boom");
    expect(finished).toEqual([2]);
  });
});

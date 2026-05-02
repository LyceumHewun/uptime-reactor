import { describe, expect, test } from "bun:test";
import { LatestByKeyQueue } from "./queue";

describe("LatestByKeyQueue", () => {
  test("keeps only latest pending task per key", async () => {
    const queue = new LatestByKeyQueue();
    const calls: string[] = [];
    let releaseFirst!: () => void;
    const firstBlock = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    queue.enqueue("12", async () => {
      calls.push("first-start");
      await firstBlock;
      calls.push("first-end");
    });
    queue.enqueue("12", async () => {
      calls.push("second");
    });
    queue.enqueue("12", async () => {
      calls.push("third");
    });

    expect(calls).toEqual(["first-start"]);
    releaseFirst();
    await queue.waitForIdle();

    expect(calls).toEqual(["first-start", "first-end", "third"]);
  });

  test("continues pending task after current task throws", async () => {
    const errors: unknown[] = [];
    const queue = new LatestByKeyQueue((error) => errors.push(error));
    const calls: string[] = [];

    queue.enqueue("12", async () => {
      calls.push("first");
      throw new Error("boom");
    });
    queue.enqueue("12", async () => {
      calls.push("second");
    });

    await queue.waitForIdle();

    expect(calls).toEqual(["first", "second"]);
    expect(errors).toHaveLength(1);
  });
});

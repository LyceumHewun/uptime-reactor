type Task = () => Promise<void>;

type QueueState = {
  running: true;
  pending?: Task;
};

export class LatestByKeyQueue {
  private states = new Map<string, QueueState>();
  private idleWaiters: Array<() => void> = [];

  constructor(private readonly onTaskError: (error: unknown) => void = () => {}) {}

  enqueue(key: string, task: Task): "started" | "replaced" {
    const state = this.states.get(key);
    if (state) {
      state.pending = task;
      return "replaced";
    }

    const nextState: QueueState = { running: true };
    this.states.set(key, nextState);
    void this.run(key, nextState, task);
    return "started";
  }

  waitForIdle(): Promise<void> {
    if (this.states.size === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private async run(key: string, state: QueueState, initialTask: Task): Promise<void> {
    let task: Task | undefined = initialTask;

    while (task) {
      try {
        await task();
      } catch (error) {
        this.onTaskError(error);
      }
      task = state.pending;
      state.pending = undefined;
    }

    this.states.delete(key);
    if (this.states.size === 0) {
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      for (const resolve of waiters) {
        resolve();
      }
    }
  }
}

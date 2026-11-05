import type { Task } from '../shared/contracts';
import type { Store } from './store';

// Progress is recoverable independently of the large workspace. Terminal commits stay synchronous.
export class TaskProgress {
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private store: Store,
    private notify: (task: Task) => void,
  ) {}
  schedule(task: Task) {
    if (!this.timer) this.timer = setTimeout(() => this.flush(task), 250);
  }
  flush(task: Task) {
    this.cancelPending();
    delete task.persistenceError;
    try {
      this.store.saveTaskProgress(task);
    } catch {
      task.persistenceError = '进度保存失败，请检查磁盘空间；当前分析仍在运行。';
    }
    this.notify(task);
  }
  cancelPending() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

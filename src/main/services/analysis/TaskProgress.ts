import type { AnalysisRecordService } from './AnalysisRecordService';
import type { Task } from '@shared/contracts';

// Coalesce progress writes to the message row; terminal transactions stay synchronous.
export class TaskProgress {
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private records: AnalysisRecordService,
    private notifyTaskChanged: (task: Task) => void,
  ) {}

  schedule(task: Task) {
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(task), 250);
  }

  flush(task: Task) {
    this.cancelPending();
    delete task.persistenceError;
    try {
      this.records.saveTaskProgress(task);
    } catch {
      task.persistenceError = '进度保存失败，请检查磁盘空间；当前分析仍在运行。';
    }
    this.notifyTaskChanged(task);
  }

  cancelPending() {
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
  }
}

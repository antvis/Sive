import type { API, State, TaskUpdate } from '@shared/contracts';

function withTask(state: State, update: TaskUpdate): State {
  return {
    ...state,
    tasks: state.tasks.some((task) => task.id === update.task.id)
      ? state.tasks.map((task) => (task.id === update.task.id ? update.task : task))
      : [update.task, ...state.tasks],
  };
}

// Full snapshots and task-only updates share a revision, so a slow state() response
// cannot overwrite newer progress, and a delayed progress event cannot revive a finished task.
export function observeWorkspace(
  api: Pick<API, 'state' | 'onChange' | 'onTaskChange'>,
  receive: (state: State) => void,
  fail: (error: unknown) => void,
) {
  let live = true;
  let sequence = 0;
  let snapshotRevision = -1;
  let current: State | null = null;
  const progress = new Map<string, TaskUpdate>();
  const refresh = async () => {
    const request = ++sequence;
    try {
      const snapshot = await api.state();
      if (!live || snapshot.revision < snapshotRevision) return;
      snapshotRevision = snapshot.revision;
      current = snapshot;
      for (const [id, update] of progress) {
        if (update.revision <= snapshotRevision) progress.delete(id);
        else current = withTask(current, update);
      }
      receive(current);
    } catch (error) {
      if (live && request === sequence) fail(error);
      throw error;
    }
  };
  const backgroundRefresh = () => void refresh().catch(() => {});
  const off = api.onChange(backgroundRefresh);
  const offTask = api.onTaskChange((update) => {
    const previous = progress.get(update.task.id);
    if (!live || update.revision <= snapshotRevision || (previous && update.revision <= previous.revision))
      return;
    progress.set(update.task.id, update);
    if (current) {
      current = withTask(current, update);
      receive(current);
    }
  });
  backgroundRefresh();
  return {
    refresh,
    dispose: () => {
      live = false;
      off();
      offTask();
    },
  };
}

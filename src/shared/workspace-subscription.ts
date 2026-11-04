import type { API, State, TaskUpdate } from '../../shared/contracts';

function withTask(state: State, update: TaskUpdate): State {
  return {
    ...state,
    task: update.task,
    tasks: state.tasks.some((task) => task.id === update.task.id)
      ? state.tasks.map((task) => (task.id === update.task.id ? update.task : task))
      : [update.task, ...state.tasks].slice(0, 300),
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
  let progress: TaskUpdate | undefined;
  const refresh = () => {
    const request = ++sequence;
    void api
      .state()
      .then((snapshot) => {
        if (!live || request !== sequence || snapshot.revision < snapshotRevision) return;
        snapshotRevision = snapshot.revision;
        if (progress && progress.revision <= snapshotRevision) progress = undefined;
        current = progress ? withTask(snapshot, progress) : snapshot;
        receive(current);
      })
      .catch((error) => {
        if (live && request === sequence) fail(error);
      });
  };
  const off = api.onChange(refresh);
  const offTask = api.onTaskChange((update) => {
    if (!live || update.revision <= snapshotRevision || (progress && update.revision <= progress.revision))
      return;
    progress = update;
    if (current) {
      current = withTask(current, update);
      receive(current);
    }
  });
  refresh();
  return () => {
    live = false;
    off();
    offTask();
  };
}

import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Run } from '../shared/contracts';
import type { Workspace } from './store';
import { validateWorkspace } from './workspace-schema';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function atomicWrite(file: string, content: string) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

export class WorkspaceLoadError extends Error {
  constructor(
    public canRecover: boolean,
    message: string,
  ) {
    super(message);
  }
}

// Immutable result files are published before the manifest. Both the current and
// previous manifest remain valid if publication fails or the process exits.
export class WorkspaceStorage {
  private references = new WeakMap<Run, string>();
  private file: string;
  private directory: string;
  private previousContent?: string;
  constructor(private root: string) {
    this.file = path.join(root, 'workspace.json');
    this.directory = path.join(root, 'results');
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
  }
  private decode(content: string): Workspace {
    const stored: unknown = JSON.parse(content);
    if (!record(stored)) throw new Error('工作区格式无效');
    if (stored.version !== 2) throw new WorkspaceLoadError(false, '工作区版本不兼容，请使用匹配的应用版本');
    if (!Array.isArray(stored.runs)) throw new Error('分析索引无效');
    const runs = stored.runs.map((reference: unknown) => {
      if (typeof reference !== 'string' || !/^[a-f0-9]{64}\.json$/.test(reference))
        throw new Error('分析文件引用无效');
      const content = fs.readFileSync(path.join(this.directory, reference), 'utf8');
      if (createHash('sha256').update(content).digest('hex') + '.json' !== reference)
        throw new Error('分析文件校验失败');
      const run = JSON.parse(content);
      if (!record(run)) throw new Error('分析文件格式无效');
      this.references.set(run as Run, reference);
      return run;
    });
    const value = { ...stored, runs };
    validateWorkspace(value);
    return value;
  }
  load(): Workspace | undefined {
    if (!fs.existsSync(this.file) && !fs.existsSync(this.file + '.bak')) return undefined;
    try {
      const content = fs.readFileSync(this.file, 'utf8');
      const workspace = this.decode(content);
      this.previousContent = content;
      return workspace;
    } catch (error) {
      if (error instanceof WorkspaceLoadError) throw error;
      let canRecover = false;
      try {
        this.decode(fs.readFileSync(this.file + '.bak', 'utf8'));
        canRecover = true;
      } catch {
        /* A backup is offered only when all referenced results are valid. */
      }
      throw new WorkspaceLoadError(canRecover, error instanceof Error ? error.message : '工作区读取失败');
    }
  }
  recover() {
    const backup = fs.readFileSync(this.file + '.bak', 'utf8');
    this.decode(backup);
    if (fs.existsSync(this.file))
      fs.copyFileSync(this.file, path.join(this.root, `workspace-damaged-${randomUUID()}.json`));
    atomicWrite(this.file, backup);
  }
  save(workspace: Workspace) {
    const runs = workspace.runs.map((run) => {
      const existing = this.references.get(run);
      if (existing) return existing;
      const content = JSON.stringify(run);
      const reference = createHash('sha256').update(content).digest('hex') + '.json';
      atomicWrite(path.join(this.directory, reference), content);
      this.references.set(run, reference);
      return reference;
    });
    const content = JSON.stringify({ ...workspace, version: 2, runs });
    if (this.previousContent) atomicWrite(this.file + '.bak', this.previousContent);
    atomicWrite(this.file, content);
    this.previousContent = content;
  }
  collectUnusedResults() {
    // Cleanup is best-effort, after loading; never jeopardize a commit.
    try {
      const keep = new Set<string>();
      for (const file of [this.file, this.file + '.bak']) {
        if (!fs.existsSync(file)) continue;
        const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (manifest.version === 2) for (const reference of manifest.runs) keep.add(reference);
      }
      for (const name of fs.readdirSync(this.directory))
        if (/^[a-f0-9]{64}\.json$/.test(name) && !keep.has(name)) fs.rmSync(path.join(this.directory, name));
    } catch {
      /* Retry next startup; failed writes may leave harmless orphan files. */
    }
  }
}

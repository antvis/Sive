import { EventEmitter } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { clipboard, dialog } from 'electron';
import type { BrowserWindow } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SnippetExportInput } from '../../../src/shared/api';

const state = vi.hoisted(() => ({
  windows: [] as any[],
  title: '标题',
  captureError: false,
  stall: false,
}));

vi.mock('node:fs/promises', () => ({ writeFile: vi.fn() }));

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    clipboard: { write: vi.fn() },
    dialog: { showSaveDialog: vi.fn() },
    ClipboardItem: class {
      constructor(public items: Record<string, Blob>) {}
    },
    BrowserWindow: class extends EventEmitter {
      destroyed = false;

      handlers = new Map<string, () => Promise<unknown>>();

      webContents = Object.assign(new EventEmitter(), {
        ipc: Object.assign(new EventEmitter(), {
          handle: (name: string, handler: () => Promise<unknown>) => this.handlers.set(name, handler),
        }),
        debugger: {
          attach: vi.fn(),
          sendCommand: vi.fn(async (name: string) => {
            if (name === 'Page.captureScreenshot') {
              if (state.captureError) throw new Error('capture failed');
              return { data: Buffer.from('png').toString('base64') };
            }
          }),
        },
        setWindowOpenHandler: vi.fn(),
        session: { setPermissionRequestHandler: vi.fn() },
      });

      constructor() {
        super();
        state.windows.push(this);
      }

      isDestroyed() {
        return this.destroyed;
      }

      destroy() {
        this.destroyed = true;
        this.emit('closed');
      }
    },
  };
});

vi.mock('../../../src/main/windows', () => ({
  loadRenderer: vi.fn(async (window: any) => {
    await window.handlers.get('snippetExport:getRenderData')();
    if (!state.stall)
      window.webContents.ipc.emit('snippetExport:renderComplete', {}, { height: 1400, title: state.title });
  }),
}));

import { exportSnippet } from '../../../src/main/util/snippetExport';

const input: SnippetExportInput = {
  snippet: {
    question: '',
    intent: '',
    title: '标题',
    summary: '内容',
    spec: { type: 'column', data: [] },
    tags: [],
    metrics: [],
    createdAt: '2026-11-23T00:00:00Z',
  },
  templateId: 'default',
  theme: { mode: 'dark', fontSize: 18 },
  target: 'clipboard',
};

describe('exportSnippet', () => {
  let parent: BrowserWindow;

  beforeEach(() => {
    state.windows = [];
    state.title = '标题';
    state.captureError = state.stall = false;
    parent = new EventEmitter() as BrowserWindow;
    vi.clearAllMocks();
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: '/tmp/snippet.png' });
  });

  afterEach(() => vi.useRealTimers());

  it('copies the captured PNG to the clipboard', async () => {
    expect(await exportSnippet(input, parent)).toBe(true);

    const item = vi.mocked(clipboard.write).mock.calls[0][0][0] as unknown as { items: Record<string, Blob> };
    expect(Buffer.from(await item.items['image/png'].arrayBuffer())).toEqual(Buffer.from('png'));
    expect(dialog.showSaveDialog).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('propagates capture errors and cleans up the window', async () => {
    state.captureError = true;

    await expect(exportSnippet(input, parent)).rejects.toThrow('capture failed');
    expect(state.windows[0].destroyed).toBe(true);
    expect(parent.listenerCount('closed')).toBe(0);
    expect(clipboard.write).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('times out a renderer that never reports ready', async () => {
    vi.useFakeTimers();
    state.stall = true;

    const pending = exportSnippet(input, parent);
    const assertion = expect(pending).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
    expect(state.windows[0].destroyed).toBe(true);
    expect(parent.listenerCount('closed')).toBe(0);
  });

  it('saves the captured PNG with a safe filename', async () => {
    state.title = '销售/季度';

    expect(await exportSnippet({ ...input, target: 'file' }, parent)).toBe(true);
    expect(dialog.showSaveDialog).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        defaultPath: 'Snippet - 销售 季度.png',
      }),
    );
    expect(writeFile).toHaveBeenCalledWith('/tmp/snippet.png', Buffer.from('png'));
    expect(clipboard.write).not.toHaveBeenCalled();
    expect(state.windows[0].destroyed).toBe(true);
  });

  it('returns false without writing when saving is cancelled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true, filePath: '' });

    expect(await exportSnippet({ ...input, target: 'file' }, parent)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(state.windows[0].destroyed).toBe(true);
  });
});

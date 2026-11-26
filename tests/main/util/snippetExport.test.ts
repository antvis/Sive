import { EventEmitter } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { clipboard, dialog } from 'electron';
import type { BrowserWindow } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snippetExportSchema } from '../../../src/shared/api';

const state = vi.hoisted(() => ({
  windows: [] as any[],
  result: { height: 1400, title: '标题' } as unknown,
  loadError: false,
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

      handlers = new Map();

      webContents = Object.assign(new EventEmitter(), {
        ipc: Object.assign(new EventEmitter(), {
          handle: (name: string, handler: Function) => this.handlers.set(name, handler),
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

      constructor(public options: unknown) {
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
    if (state.loadError) throw new Error('load failed');
    await window.handlers.get('snippetExport:getRenderData')();
    if (!state.stall) window.webContents.ipc.emit('snippetExport:renderComplete', {}, state.result);
  }),
}));

import { exportSnippet } from '../../../src/main/util/snippetExport';

const input = snippetExportSchema.parse({
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
});

describe('native snippet export', () => {
  let parent: BrowserWindow;

  beforeEach(() => {
    state.windows = [];
    state.result = { height: 1400, title: '标题' };
    state.loadError = state.captureError = state.stall = false;
    parent = new EventEmitter() as BrowserWindow;
    vi.clearAllMocks();
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: false, filePath: '/tmp/snippet.png' });
  });

  afterEach(() => vi.useRealTimers());

  it('captures the full long card at 2× and destroys the isolated window', async () => {
    const result = await exportSnippet(input, parent);
    const window = state.windows[0];
    expect(result).toBe(true);
    const item = vi.mocked(clipboard.write).mock.calls[0][0][0] as unknown as { items: Record<string, Blob> };
    expect(Buffer.from(await item.items['image/png'].arrayBuffer())).toEqual(Buffer.from('png'));
    expect(window.options).toMatchObject({
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    expect(window.webContents.debugger.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({ width: 800, deviceScaleFactor: 2 }),
    );
    expect(window.webContents.debugger.sendCommand).toHaveBeenCalledWith(
      'Page.captureScreenshot',
      expect.objectContaining({
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: 800, height: 1400, scale: 1 },
      }),
    );
    expect(window.destroyed).toBe(true);
    expect(parent.listenerCount('closed')).toBe(0);
  });

  it.each(['load', 'capture', 'render', 'oversize'])('cleans up after %s failure', async (failure) => {
    if (failure === 'load') state.loadError = true;
    if (failure === 'capture') state.captureError = true;
    if (failure === 'render') state.result = { error: 'render failed' };
    if (failure === 'oversize') state.result = { height: 100000, title: '' };
    await expect(exportSnippet(input, parent)).rejects.toThrow();
    expect(state.windows[0].destroyed).toBe(true);
    expect(parent.listenerCount('closed')).toBe(0);
  });

  it('times out a renderer that never reports ready', async () => {
    vi.useFakeTimers();
    state.stall = true;
    const pending = exportSnippet(input, parent);
    const assertion = expect(pending).rejects.toThrow('超时');
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
    expect(state.windows[0].destroyed).toBe(true);
  });

  it.each(['parent', 'renderer'])('aborts when %s exits', async (source) => {
    state.stall = true;
    const pending = exportSnippet(input, parent);
    const assertion = expect(pending).rejects.toThrow();
    if (source === 'parent') parent.emit('closed');
    else state.windows[0].webContents.emit('render-process-gone');
    await assertion;
    expect(state.windows[0].destroyed).toBe(true);
  });

  it('validates the requested theme and snippet content', () => {
    expect(() => snippetExportSchema.parse({ ...input, theme: { mode: 'system', fontSize: 0 } })).toThrow();
    expect(() => snippetExportSchema.parse({ ...input, snippet: { spec: null } })).toThrow();
  });

  it('saves the captured PNG through the existing save dialog', async () => {
    expect(await exportSnippet({ ...input, target: 'file' }, parent)).toBe(true);
    expect(dialog.showSaveDialog).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        defaultPath: 'Snippet - 标题.png',
      }),
    );
    expect(writeFile).toHaveBeenCalledWith('/tmp/snippet.png', Buffer.from('png'));
  });

  it('returns false without writing when saving is cancelled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true, filePath: '' });
    expect(await exportSnippet({ ...input, target: 'file' }, parent)).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
    expect(state.windows[0].destroyed).toBe(true);
  });
});

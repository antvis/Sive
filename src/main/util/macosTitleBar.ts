import type { BrowserWindow } from 'electron';

const NSWindowMiniaturizeButton = 1;
const NSWindowZoomButton = 2;

export async function configureMacCloseOnlyTitleBar(window: BrowserWindow) {
  const { decode, load } = await import('koffi');
  if (window.isDestroyed()) return;

  const objc = load('/usr/lib/libobjc.A.dylib');
  const selector = objc.func('sel_registerName', 'void *', ['str']);
  const getWindow = objc.func('objc_msgSend', 'void *', ['void *', 'void *']);
  const getButton = objc.func('objc_msgSend', 'void *', ['void *', 'void *', 'unsigned long']);
  const setHidden = objc.func('objc_msgSend', 'void', ['void *', 'void *', 'bool']);

  // Electron's native handle points to the content NSView, which owns the NSWindow reference.
  const view = decode(window.getNativeWindowHandle(), 'void *');
  const nativeWindow = getWindow(view, selector('window'));
  if (!nativeWindow) throw new Error('The settings window has no AppKit window.');

  const standardWindowButton = selector('standardWindowButton:');
  const setHiddenSelector = selector('setHidden:');
  for (const kind of [NSWindowMiniaturizeButton, NSWindowZoomButton]) {
    const button = getButton(nativeWindow, standardWindowButton, kind);
    if (button) setHidden(button, setHiddenSelector, true);
  }
}

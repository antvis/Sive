import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('./hero.js', import.meta.url), 'utf8');

function mount({ width = 1024, reduced = false } = {}) {
  const frames = new Map();
  const timers = new Map();
  const observers = [];
  const canvases = [];
  let sequence = 0;
  let now = 0;

  function element() {
    const handlers = new Map();
    const classes = new Set();
    return {
      children: [],
      attributes: {},
      properties: {},
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
      },
      style: {
        setProperty(name, value) {
          this[name] = value;
        },
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      addEventListener(name, callback) {
        handlers.set(name, callback);
      },
      dispatch(name, event = {}) {
        handlers.get(name)?.(event);
      },
      closest: () => null,
    };
  }

  const hero = element();
  hero.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 950 });
  const copy = { getBoundingClientRect: () => ({ left: 25, top: 150, width: width - 50, height: 220 }) };
  const stage = { getBoundingClientRect: () => ({ left: 0, top: 430 }) };
  const media = Object.assign(element(), {
    offsetLeft: 30,
    offsetTop: 0,
    offsetWidth: width - 60,
    offsetHeight: 430,
  });
  const host = element();
  const image = element();
  const words = [element(), element(), element()];
  words[0].classList.add('is-active');
  const selectors = {
    '.hero': hero,
    '#ambient-canvas': host,
    '.hero-copy': copy,
    '.hero-stage': stage,
    '.hero-media': media,
    '#demo-overview': image,
  };
  const document = Object.assign(element(), {
    hidden: false,
    fonts: { ready: Promise.resolve() },
    querySelector: (selector) => {
      assert(selectors[selector], selector);
      return selectors[selector];
    },
    querySelectorAll: () => words,
    createElement(tag) {
      const node = element();
      if (tag === 'canvas') {
        node.marks = [];
        node.paints = 0;
        const context = {
          setTransform() {},
          clearRect() {
            node.marks.length = 0;
            node.paints++;
          },
          drawImage() {},
          fillText(glyph, x, y) {
            assert(Number.isFinite(x) && Number.isFinite(y));
            node.marks.push({ glyph, x, y, alpha: this.globalAlpha });
          },
        };
        node.getContext = () => context;
        canvases.push(node);
      }
      return node;
    },
  });
  const motion = Object.assign(element(), { matches: reduced });
  runInNewContext(source, {
    document,
    devicePixelRatio: 2,
    matchMedia: () => motion,
    getComputedStyle: () => ({ color: '#2d806c' }),
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      frames.set(++sequence, callback);
      return sequence;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    setInterval: (callback) => {
      timers.set(++sequence, callback);
      return sequence;
    },
    clearInterval: (id) => timers.delete(id),
    ResizeObserver: class {
      observe() {}
    },
    IntersectionObserver: class {
      constructor(callback) {
        observers.push(this);
        this.callback = callback;
      }
      observe(target) {
        this.target = target;
      }
    },
  });
  return {
    hero,
    media,
    document,
    motion,
    frames,
    timers,
    words,
    observers,
    canvas: canvases[0],
    pattern: canvases[1],
    advance(milliseconds) {
      for (const end = now + milliseconds; now < end; now += 40) {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(now));
      }
    },
  };
}

test('the original fine ASCII texture stays faint behind the title and clear of the image at all sizes', () => {
  for (const width of [320, 736, 1440]) {
    const app = mount({ width });
    assert.equal(app.canvas.width, width * 2);
    assert(app.canvas.marks.length > 0);
    for (const { x, y } of app.canvas.marks) {
      assert(x >= 0 && x <= width && y >= 0 && y <= 950);
      assert(!(x > 25 && x < width - 25 && y > 150 && y < 370));
      assert(!(x > 30 && x < width - 30 && y > 430 && y < 860));
    }
    for (const { x, y, alpha } of app.pattern.marks) {
      assert(!(x > 30 && x < width - 30 && y > 430 && y < 860));
      if (x > 25 && x < width - 25 && y > 150 && y < 370) assert(alpha <= 0.006);
      assert(alpha <= 0.06);
    }
    assert(app.pattern.marks.length / (width * 950) < 0.0025);
    assert(Math.max(...app.pattern.marks.map(({ alpha }) => alpha)) >= 0.05);
  }
});

test('image scan and tilt respect links and touch, and scans finish automatically', () => {
  const app = mount();
  app.hero.dispatch('pointermove', { clientX: 140, clientY: 500, pointerType: 'mouse', target: app.media });
  assert.notEqual(app.media.style['--hero-rx'], '0deg');
  app.hero.dispatch('pointerleave');
  app.hero.dispatch('pointermove', { clientX: 140, clientY: 500, pointerType: 'touch', target: app.media });
  assert.equal(app.media.style['--hero-rx'], '0deg');
  app.hero.dispatch('click', { target: { closest: () => ({}) } });
  assert.equal(app.media.classList.contains('is-scanning'), false);
  app.hero.dispatch('click', { target: app.media });
  assert(app.media.classList.contains('is-scanning'));
  app.advance(3000);
  assert.equal(app.media.classList.contains('is-scanning'), false);
});

test('the whole hero keeps animating while its image is visible, and stops offscreen or hidden', () => {
  const app = mount();
  assert.equal(app.observers[0].target, app.hero);
  assert.equal(app.frames.size, 1);
  assert.equal(app.timers.size, 1);
  app.observers[0].callback([{ isIntersecting: false }]);
  assert.equal(app.frames.size, 0);
  assert.equal(app.timers.size, 0);
  app.observers[0].callback([{ isIntersecting: true }]);
  assert.equal(app.frames.size, 1);
  app.document.hidden = true;
  app.document.dispatch('visibilitychange');
  assert.equal(app.frames.size, 0);
  assert.equal(app.timers.size, 0);
});

test('reduced motion keeps the texture static and disables scan, tilt, and title rotation', () => {
  const app = mount({ reduced: true });
  assert.equal(app.frames.size, 0);
  assert.equal(app.timers.size, 0);
  assert(app.pattern.marks.length > 0);
  app.hero.dispatch('click', { target: app.media });
  assert.equal(app.media.classList.contains('is-scanning'), false);
  app.hero.dispatch('pointermove', { clientX: 140, clientY: 500, pointerType: 'mouse', target: app.media });
  assert.equal(app.media.style['--hero-rx'], '0deg');
});

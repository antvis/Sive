import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('./download.js', import.meta.url), 'utf8');

function mount({ reduced = false } = {}) {
  function element() {
    const classes = new Set();
    return Object.assign(new EventTarget(), {
      children: [],
      attributes: {},
      style: { setProperty() {} },
      classList: {
        toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name)),
        contains: (name) => classes.has(name),
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    });
  }

  const waterfall = element();
  const download = Object.assign(element(), { querySelector: () => waterfall });
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    querySelector: () => download,
    createElement: element,
  });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  let setVisible;
  runInNewContext(source, {
    document,
    matchMedia: () => motion,
    IntersectionObserver: class {
      constructor(callback) {
        setVisible = (isIntersecting) => callback([{ isIntersecting }]);
      }
      observe(target) {
        assert.equal(target, download);
      }
    },
  });
  return { waterfall, document, motion, setVisible, button: download.children[0] };
}

test('waterfall contains duplicated ASCII streams for a seamless downward loop', () => {
  const { waterfall, button } = mount();
  assert.equal(waterfall.children.length, 36);
  const texts = new Set();
  for (const stream of waterfall.children) {
    assert.equal(stream.children.length, 2);
    const text = stream.children[0].textContent;
    assert.equal(stream.children[1].textContent, text);
    assert.equal(text.split('\n').length, 40);
    assert.match(text, /^[\x20-\x7e\n]+$/);
    texts.add(text);
  }
  assert(texts.size > 1);
  assert.equal(button.type, 'button');
});

test('waterfall pauses offscreen, in hidden pages, and through its keyboard-accessible button', () => {
  const { waterfall, button, document, setVisible } = mount();
  const flowing = () => waterfall.classList.contains('is-flowing');
  assert.equal(flowing(), false);
  setVisible(true);
  assert.equal(flowing(), true);
  button.dispatchEvent(new Event('click'));
  assert.equal(flowing(), false);
  assert.equal(button.attributes['aria-pressed'], 'true');
  setVisible(false);
  setVisible(true);
  assert.equal(flowing(), false);
  button.dispatchEvent(new Event('click'));
  assert.equal(flowing(), true);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(flowing(), false);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(flowing(), true);
  setVisible(false);
  assert.equal(flowing(), false);
});

test('reduced motion keeps ASCII static and preserves a manual pause when preferences change', () => {
  const { waterfall, button, motion, setVisible } = mount({ reduced: true });
  setVisible(true);
  assert.equal(waterfall.classList.contains('is-flowing'), false);
  assert.equal(button.disabled, true);
  motion.matches = false;
  motion.dispatchEvent(new Event('change'));
  assert.equal(waterfall.classList.contains('is-flowing'), true);
  assert.equal(button.disabled, false);
  button.dispatchEvent(new Event('click'));
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  motion.matches = false;
  motion.dispatchEvent(new Event('change'));
  assert.equal(waterfall.classList.contains('is-flowing'), false);
});

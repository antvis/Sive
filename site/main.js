import { detectDevice } from './device.js';
import './hero.js';
import './download.js';

document.querySelector('#year').textContent = new Date().getFullYear();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const downloadMenus = [...document.querySelectorAll('.download-menu')];
const template = document.querySelector('#download-panel-template');
for (const menu of downloadMenus) {
  menu.querySelector('[data-download-panel]').replaceChildren(template.content.cloneNode(true));
}

for (const menu of document.querySelectorAll('.download-menu, .platform-submenu')) {
  const summary = menu.querySelector(':scope > summary');
  summary.setAttribute('aria-expanded', 'false');

  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') menu.open = true;
  });

  menu.addEventListener('pointerleave', () => {
    if (!menu.contains(document.activeElement) || document.activeElement === summary) menu.open = false;
  });

  menu.addEventListener('toggle', () => {
    summary.setAttribute('aria-expanded', String(menu.open));
    if (!menu.open) return;
    const siblings = menu.classList.contains('download-menu')
      ? downloadMenus
      : [...menu.closest('.download-options').querySelectorAll('.platform-submenu')];
    siblings.forEach((other) => {
      if (other !== menu) other.open = false;
    });
    const panel = menu.querySelector(':scope > .platform-submenu-panel');
    if (panel) {
      delete menu.dataset.side;
      if (panel.getBoundingClientRect().right > innerWidth - 16) menu.dataset.side = 'left';
    }
  });

  menu.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (!menu.contains(document.activeElement)) menu.open = false;
    });
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    menu.open = false;
    summary.focus();
  });
}

document.addEventListener('pointerdown', (event) => {
  downloadMenus.forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});

function markDevice(device) {
  document.querySelectorAll('[data-platform]').forEach((row) => {
    const current = row.dataset.platform === device.platform;
    row.querySelector('.current-device').hidden = !current;
    row.classList.toggle('is-current', current);
    const submenu = row.closest('.platform-submenu');
    if (submenu) {
      submenu.querySelectorAll('[data-arch]').forEach((choice) => {
        const match = current && choice.dataset.arch === device.architecture;
        choice.classList.toggle('is-current-chip', match);
        const dot = choice.querySelector('.current-chip');
        if (dot) dot.hidden = !match;
      });
    }
  });
}

const deviceInput = {
  userAgent: navigator.userAgent,
  platform: navigator.userAgentData?.platform || navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints,
};
markDevice(detectDevice(deviceInput));
if (navigator.userAgentData?.getHighEntropyValues) {
  navigator.userAgentData
    .getHighEntropyValues(['architecture', 'bitness'])
    .then((hints) => {
      markDevice(detectDevice({ ...deviceInput, ...hints }));
    })
    .catch(() => {
      // Keep the OS-only marker when the browser withholds CPU information.
    });
}

const scenes = [...document.querySelectorAll('.demo-scene')];
const chapterNav = document.querySelector('.chapter-progress');
const chapterLinks = [...chapterNav.querySelectorAll('a')];
const sceneObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      chapterNav.classList.add('is-visible');
      chapterLinks.forEach((link, index) => {
        if (index === Number(entry.target.dataset.step)) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    }
  },
  { rootMargin: '-20% 0px -35% 0px' },
);
scenes.forEach((scene) => sceneObserver.observe(scene));
const storyBounds = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) chapterNav.classList.remove('is-visible');
  },
  { threshold: 0.2 },
);
storyBounds.observe(document.querySelector('.hero'));
storyBounds.observe(document.querySelector('.download'));

// Keep complete heading text in the DOM for layout and screen readers.
const typedHeadings = [...document.querySelectorAll('.scene-copy h2, .story-intro h2')];
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.45 },
);
for (const heading of typedHeadings) {
  heading.setAttribute('aria-label', heading.textContent);
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const char of Array.from(node.textContent)) {
      const span = document.createElement('span');
      span.className = 'type-character';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--character', index++);
      span.textContent = char;
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
  if (reducedMotion.matches) heading.classList.add('is-revealed');
  else revealObserver.observe(heading);
}

const descriptions = [...document.querySelectorAll('.hero-description, .scene-copy > p')];
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
for (const paragraph of descriptions) {
  const words = [...segmenter.segment(paragraph.textContent.trim().replace(/\s+/g, ' '))];
  paragraph.replaceChildren(
    ...words.map(({ segment }, index) => {
      const span = document.createElement('span');
      span.className = 'wave-word';
      span.style.setProperty('--word', index);
      span.textContent = segment;
      return span;
    }),
  );
  if (reducedMotion.matches) paragraph.classList.add('is-revealed');
  else revealObserver.observe(paragraph);
}

const revealBlocks = [...document.querySelectorAll('.scene-demo, .download')];
for (const block of revealBlocks) {
  block.classList.add('reveal-pending');
  if (reducedMotion.matches) block.classList.add('is-revealed');
  else revealObserver.observe(block);
}

reducedMotion.addEventListener('change', (event) => {
  if (event.matches) {
    [...typedHeadings, ...descriptions, ...revealBlocks].forEach((element) => element.classList.add('is-revealed'));
  }
});

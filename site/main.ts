import { detectDevice } from './device.ts';

document.querySelector<HTMLElement>('#year')!.textContent = String(new Date().getFullYear());
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const downloadMenus = [...document.querySelectorAll<HTMLDetailsElement>('.download-menu')];

for (const menu of document.querySelectorAll<HTMLDetailsElement>('.download-menu, .platform-submenu')) {
  const summary = menu.querySelector<HTMLElement>(':scope > summary')!;
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
      : [
          ...menu
            .closest<HTMLElement>('.download-options')!
            .querySelectorAll<HTMLDetailsElement>('.platform-submenu'),
        ];
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
    if (event.key !== 'Escape' || !menu.open) return;
    event.stopPropagation();
    menu.open = false;
    summary.focus();
  });
}

document.addEventListener('pointerdown', (event) => {
  downloadMenus.forEach((menu) => {
    if (!menu.contains(event.target as Node | null)) menu.open = false;
  });
});

function markDevice(device: ReturnType<typeof detectDevice>) {
  document.querySelectorAll<HTMLElement>('[data-platform]').forEach((row) => {
    const current = row.dataset.platform === device.platform;
    row.querySelector<HTMLElement>('.current-device')!.hidden = !current;
    row.classList.toggle('is-current', current);
    const submenu = row.closest('.platform-submenu');
    if (submenu) {
      submenu.querySelectorAll<HTMLElement>('[data-arch]').forEach((choice) => {
        const match = current && choice.dataset.arch === device.architecture;
        choice.classList.toggle('is-current-chip', match);
        const dot = choice.querySelector<HTMLElement>('.current-chip');
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

function initScrollEffects() {
  if (typeof IntersectionObserver !== 'function') {
    document.querySelector<HTMLDetailsElement>('.nav-download')!.hidden = false;
    return;
  }

  const navDownload = document.querySelector<HTMLDetailsElement>('.nav-download')!;
  const heroCopyObserver = new IntersectionObserver(([entry]) => {
    navDownload.hidden = entry.boundingClientRect.bottom > 0;
    if (navDownload.hidden) navDownload.open = false;
  });
  heroCopyObserver.observe(document.querySelector('.hero-copy')!);

  const scenes = [...document.querySelectorAll<HTMLElement>('.demo-scene')];
  const chapterNav = document.querySelector<HTMLElement>('.chapter-progress')!;
  const chapterLinks = [...chapterNav.querySelectorAll('a')];
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        chapterNav.classList.add('is-visible');
        chapterLinks.forEach((link, index) => {
          if (index === Number((entry.target as HTMLElement).dataset.step))
            link.setAttribute('aria-current', 'step');
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
  storyBounds.observe(document.querySelector<HTMLElement>('.hero')!);
  storyBounds.observe(document.querySelector<HTMLElement>('.download')!);

  // Keep complete heading text in the DOM for layout and screen readers.
  const typedHeadings = [...document.querySelectorAll<HTMLElement>('.scene-copy h2, .story-intro h2')];
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
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    let index = 0;
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const char of Array.from(node.data)) {
        const span = document.createElement('span');
        span.className = 'type-character';
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--character', String(index++));
        span.textContent = char;
        fragment.append(span);
      }
      node.replaceWith(fragment);
    }
    if (reducedMotion.matches) heading.classList.add('is-revealed');
    else {
      revealObserver.observe(heading);
      heading.classList.add('reveal-pending');
    }
  }

  const descriptions = [...document.querySelectorAll('.hero-description, .scene-copy > p')];
  const segmenter =
    typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'word' }) : null;
  for (const paragraph of descriptions) {
    if (!segmenter) continue;
    const words = [...segmenter.segment(paragraph.textContent.trim().replace(/\s+/g, ' '))];
    paragraph.replaceChildren(
      ...words.map(({ segment }, index) => {
        const span = document.createElement('span');
        span.className = 'wave-word';
        span.style.setProperty('--word', String(index));
        span.textContent = segment;
        return span;
      }),
    );
    if (reducedMotion.matches) paragraph.classList.add('is-revealed');
    else {
      revealObserver.observe(paragraph);
      paragraph.classList.add('reveal-pending');
    }
  }

  const revealBlocks = [...document.querySelectorAll('.scene-demo, .download')];
  for (const block of revealBlocks) {
    if (reducedMotion.matches) block.classList.add('is-revealed');
    else {
      revealObserver.observe(block);
      block.classList.add('reveal-pending');
    }
  }

  reducedMotion.addEventListener?.('change', (event) => {
    if (event.matches) {
      [...typedHeadings, ...descriptions, ...revealBlocks].forEach((element) =>
        element.classList.add('is-revealed'),
      );
    }
  });
}

// Dynamic imports keep optional animation failures isolated after bundling.
import('./hero.ts').catch((error) => console.warn('Hero animation unavailable', error));
import('./download.ts').catch((error) => console.warn('Download animation unavailable', error));

initScrollEffects();

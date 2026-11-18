function initHero() {
  if (typeof ResizeObserver !== 'function' || typeof IntersectionObserver !== 'function') return;

  const hero = document.querySelector<HTMLElement>('.hero')!;
  const host = document.querySelector<HTMLElement>('#ambient-canvas')!;
  const copy = document.querySelector<HTMLElement>('.hero-copy')!;
  const stage = document.querySelector<HTMLElement>('.hero-stage')!;
  const media = document.querySelector<HTMLElement>('.hero-media')!;
  const image = document.querySelector<HTMLImageElement>('#demo-overview')!;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const pattern = document.createElement('canvas');
  const patternContext = pattern.getContext('2d')!;
  if (!context || !patternContext) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const words = [...document.querySelectorAll('.hero-capability')];
  const colors = words.map((word) => getComputedStyle(word).color);
  const chars = '01.:+';
  const textureChars = '0123456789.,:+=';
  host.append(canvas);

  let width = 1;
  let height = 1;
  let card = { x: 0, y: 0, w: 1, h: 1 };
  let safe = { x: 0, y: 0, w: 1, h: 1 };
  let pointer: { x: number; y: number } | null = null;
  let pulse: { age: number } | null = null;
  let inView = true;
  let animation = 0;
  let wordTimer = 0;
  let wordIndex = 0;
  let elapsed = 0;
  let previousTime = 0;
  let lastFrame = 0;

  function inBox(x: number, y: number, box: typeof card, padding = 0) {
    return (
      x > box.x - padding && x < box.x + box.w + padding && y > box.y - padding && y < box.y + box.h + padding
    );
  }

  function paintPattern() {
    const scale = Math.min(devicePixelRatio || 1, 2);
    pattern.width = Math.round(width * scale);
    pattern.height = Math.round(height * scale);
    patternContext.setTransform(scale, 0, 0, scale, 0, 0);
    patternContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    patternContext.textAlign = 'center';
    patternContext.fillStyle = getComputedStyle(hero).color;
    for (let y = 12; y < height; y += 22) {
      for (let x = 12; x < width; x += 20) {
        if (inBox(x, y, card, 12)) continue;
        const edge = Math.max(0.1, Math.min(1, Math.abs(x - width / 2) / (width * 0.43)));
        patternContext.globalAlpha = 0.06 * edge * (inBox(x, y, safe, 16) ? 0.1 : 1);
        const index = Math.floor(x / 20 + (y / 22) * 7);
        patternContext.fillText(textureChars[index % textureChars.length], x, y);
      }
    }
    patternContext.globalAlpha = 1;
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.drawImage(pattern, 0, 0, width, height);
    context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const cx = card.x + card.w / 2;
    const cy = card.y + card.h / 2;
    // The image hides the middle of each path, leaving the data flowing around its edges.
    for (let lane = 0; lane < 3; lane++) {
      const rx = Math.min(width * 0.495, card.w * 0.54 + 16 + lane * 12);
      const ry = card.h * 0.51 + 18 + lane * 12;
      const count = Math.ceil(((rx + ry) * 2.6) / 18);
      for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2 + elapsed * 0.055;
        const x = cx + Math.cos(angle) * rx;
        const y =
          cy +
          Math.sin(angle) * ry -
          Math.cos(angle) * card.h * 0.1 +
          Math.sin(angle * 3 + elapsed * 0.25) * 3;
        if (
          x < 7 ||
          x > width - 7 ||
          y < 6 ||
          y > height - 7 ||
          inBox(x, y, card, 8) ||
          inBox(x, y, safe, 15)
        )
          continue;
        const near = pointer ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 145) : 0;
        const phase = (angle + Math.PI * 2 - elapsed * 0.3) % (Math.PI * 2);
        const trail = Math.pow((1 + Math.sin(phase)) / 2, 10);
        const flash = pulse
          ? Math.exp(-Math.pow(((angle + Math.PI * 2) % (Math.PI * 2)) - pulse.age * 3, 2) * 3) *
            Math.exp(-pulse.age * 0.3)
          : 0;
        context.fillStyle = near > 0.2 || trail > 0.3 || flash > 0.2 ? colors[wordIndex] : '#648dad';
        context.globalAlpha = Math.min(0.68, 0.38 * (0.32 + trail * 0.68) + near * 0.3 + flash * 0.4);
        const shift = Math.sin(elapsed * 0.7 + index * 0.3 + lane) * near * 4;
        context.fillText(chars[(index * 3 + lane * 7) % chars.length], x, y + shift);
      }
    }
    if (pointer) {
      context.fillStyle = colors[wordIndex];
      for (let row = -2; row <= 2; row++) {
        for (let column = -2; column <= 2; column++) {
          const x = Math.round(pointer.x / 40) * 40 + column * 40;
          const y = Math.round(pointer.y / 44) * 44 + row * 44;
          if (
            x < 6 ||
            x > width - 6 ||
            y < 6 ||
            y > height - 6 ||
            inBox(x, y, card, 12) ||
            inBox(x, y, safe, 40)
          )
            continue;
          context.globalAlpha = Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 88) * 0.18;
          context.fillText(chars[Math.floor(x / 40 + (y / 44) * 7) % chars.length], x, y);
        }
      }
    }
    context.globalAlpha = 1;
  }

  function resize() {
    const bounds = hero.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    const copyBounds = copy.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    // Measure the untransformed container so hover tilt cannot move the paths.
    card = {
      x: stageBounds.left - bounds.left + media.offsetLeft,
      y: stageBounds.top - bounds.top + media.offsetTop,
      w: media.offsetWidth,
      h: media.offsetHeight,
    };
    safe = {
      x: copyBounds.left - bounds.left,
      y: copyBounds.top - bounds.top,
      w: copyBounds.width,
      h: copyBounds.height,
    };
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    paintPattern();
    draw();
  }

  function frame(time: number) {
    const dt = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    elapsed += dt;
    if (pulse) {
      pulse.age += dt;
      if (pulse.age > 2.6) {
        pulse = null;
        media.classList.remove('is-scanning');
      }
    }
    if (time - lastFrame > 32) {
      lastFrame = time;
      draw();
    }
    animation = requestAnimationFrame(frame);
  }

  function resetTilt() {
    media.style.setProperty('--hero-rx', '0deg');
    media.style.setProperty('--hero-ry', '0deg');
  }

  function updateMotion() {
    cancelAnimationFrame(animation);
    clearInterval(wordTimer);
    const active = !reducedMotion.matches && inView && !document.hidden;
    if (active) {
      previousTime = performance.now();
      animation = requestAnimationFrame(frame);
      wordTimer = window.setInterval(() => {
        words.forEach((item) => item.classList.remove('is-exiting'));
        words[wordIndex].classList.remove('is-active');
        words[wordIndex].classList.add('is-exiting');
        wordIndex = (wordIndex + 1) % words.length;
        words[wordIndex].classList.add('is-active');
      }, 3200);
    } else {
      pulse = null;
      pointer = null;
      media.classList.remove('is-scanning');
      resetTilt();
      draw();
    }
  }

  function scanImage() {
    if (reducedMotion.matches || !inView || document.hidden) return;
    pulse = { age: 0 };
    media.classList.remove('is-scanning');
    void media.offsetWidth;
    media.classList.add('is-scanning');
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  const ambientObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateMotion();
  });
  ambientObserver.observe(hero);
  image.addEventListener('load', resize);
  document.fonts.ready.then(resize);
  hero.addEventListener(
    'pointermove',
    (event) => {
      if (
        reducedMotion.matches ||
        event.pointerType === 'touch' ||
        (event.target instanceof Element && event.target.closest('a,button,summary,details'))
      )
        return;
      const bounds = hero.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      if (inBox(pointer.x, pointer.y, card, 60)) {
        const px = Math.max(0, Math.min(1, (pointer.x - card.x) / card.w));
        const py = Math.max(0, Math.min(1, (pointer.y - card.y) / card.h));
        media.style.setProperty('--hero-rx', `${(0.5 - py) * 1.2}deg`);
        media.style.setProperty('--hero-ry', `${(px - 0.5) * 1.2}deg`);
        media.style.setProperty('--hero-px', `${px * 100}%`);
        media.style.setProperty('--hero-py', `${py * 100}%`);
      } else resetTilt();
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => {
    pointer = null;
    resetTilt();
  });
  hero.addEventListener('click', (event) => {
    if (!(event.target instanceof Element && event.target.closest('a,button,summary,details'))) scanImage();
  });
  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener?.('change', updateMotion);
  resize();
  updateMotion();
}

initHero();

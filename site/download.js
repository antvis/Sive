const download = document.querySelector('.download');
const waterfall = download.querySelector('.download-decor');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const chars = '0123456789.:+*=/<>[]{}-';

for (let column = 0; column < 36; column++) {
  const stream = document.createElement('span');
  stream.className = 'download-stream';
  stream.style.setProperty('--column', column);
  stream.style.setProperty('--duration', `${14 + ((column * 7) % 11)}s`);
  stream.style.setProperty('--delay', `${-(column * 13) % 23}s`);
  const text = Array.from({ length: 40 }, (_, row) =>
    (row + column) % 7 < 2 ? ' ' : chars[(column * 11 + row * 7) % chars.length],
  ).join('\n');
  for (let repeat = 0; repeat < 2; repeat++) {
    const part = document.createElement('span');
    part.textContent = text;
    stream.append(part);
  }
  waterfall.append(stream);
}

const motionButton = document.createElement('button');
motionButton.type = 'button';
motionButton.className = 'download-motion';
download.append(motionButton);
let paused = false;
let inView = false;

function updateMotion() {
  waterfall.classList.toggle('is-flowing', !paused && !reducedMotion.matches && inView && !document.hidden);
  motionButton.textContent = reducedMotion.matches
    ? '已减少动态效果'
    : paused
      ? '播放背景动效'
      : '暂停背景动效';
  motionButton.setAttribute('aria-pressed', String(paused || reducedMotion.matches));
  motionButton.disabled = reducedMotion.matches;
}

const observer = new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  updateMotion();
});
observer.observe(download);
motionButton.addEventListener('click', () => {
  paused = !paused;
  updateMotion();
});
document.addEventListener('visibilitychange', updateMotion);
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

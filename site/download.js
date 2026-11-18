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

let inView = false;

function updateMotion() {
  waterfall.classList.toggle('is-flowing', !reducedMotion.matches && inView && !document.hidden);
}

const observer = new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  updateMotion();
});
observer.observe(download);
document.addEventListener('visibilitychange', updateMotion);
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

const states = new Map();
const frames = Array.from(document.querySelectorAll('iframe[data-chart-document]'));
addEventListener('message', (event) => {
  if (event.data?.type !== 'ava-chart') return;
  const frame = frames.find((f) => f.contentWindow === event.source);
  if (!frame) return;
  states.set(frame, event.data.status);
  frame.nextElementSibling.textContent =
    event.data.status === 'ready'
      ? ''
      : event.data.status === 'error'
        ? '图表未能渲染，请展开下方 SQL 与计算数据核对。'
        : '正在绘制图表…';
});
window.analysisReady = () => {
  return frames.some((f) => states.get(f) === 'error')
    ? 'error'
    : frames.every((f) => states.get(f) === 'ready')
      ? 'ready'
      : 'waiting';
};
for (const frame of frames) {
  frame.srcdoc = frame.dataset.chartDocument.replace(
    '<script data-sive-runtime><' + '/script>',
    () => '<script>' + runtime + '<' + '/script>',
  );
  delete frame.dataset.chartDocument;
}
addEventListener('beforeprint', () => {
  for (const d of document.querySelectorAll('details')) {
    d.dataset.wasOpen = String(d.open);
    d.open = true;
  }
});
addEventListener('afterprint', () => {
  for (const d of document.querySelectorAll('details')) d.open = d.dataset.wasOpen === 'true';
});

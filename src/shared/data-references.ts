import type { Dataset } from '../../shared/contracts';

type Source = Pick<Dataset, 'id' | 'name'>;

export function dataReferences<T extends Source>(datasets: T[]) {
  const names = datasets.map((d) => d.name.replace(/[「」\r\n]/g, ' '));
  return datasets.map((dataset, index) => ({
    dataset,
    value: `「${names[index]}${names.filter((name) => name === names[index]).length > 1 ? ` · ${dataset.id}` : ''}」`,
  }));
}

export function referencedDatasets(text: string, datasets: Source[]) {
  return dataReferences(datasets)
    .filter((ref) => text.includes('@' + ref.value))
    .map((ref) => ref.dataset);
}

export function questionText(text: string, datasets: Source[]) {
  return dataReferences(datasets)
    .reduce((value, ref) => value.split('@' + ref.value).join(''), text)
    .trim();
}

// One analysis uses one source. Replacing a reference preserves the actual question.
export function withDataReference(text: string, dataset: Source, datasets: Source[]) {
  const ref = dataReferences(datasets).find((item) => item.dataset.id === dataset.id);
  return ref ? '@' + ref.value + ' ' + questionText(text, datasets) : text;
}

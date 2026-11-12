import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '../utils';

const DIRECTORY_KEY = 'sive.last-import-directory';

export function useImportCsv() {
  const [importing, setImporting] = useState(false);

  const importCsv = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const dataset = await window.workbench.datasetImportCsv(
        localStorage.getItem(DIRECTORY_KEY) ?? undefined,
      );
      if (dataset) {
        localStorage.setItem(DIRECTORY_KEY, dataset.directory);
        toast.success(`已添加数据源“${dataset.name}”`);
      }
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setImporting(false);
    }
  };

  return { importing, importCsv };
}

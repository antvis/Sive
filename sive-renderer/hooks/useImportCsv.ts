import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '../utils';

export function useImportCsv() {
  const [importing, setImporting] = useState(false);

  const importCsv = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const dataset = await window.workbench.datasetImportCsv();
      if (dataset) toast.success(`已添加数据源“${dataset.name}”`);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setImporting(false);
    }
  };

  return { importing, importCsv };
}

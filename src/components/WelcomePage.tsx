import type { Dataset } from '../../shared/contracts';
import DataSourcePicker from './DataSourcePicker';
import MySQLConnectionDialog from './MySQLConnectionDialog';
import { useDataSourceActions } from '../shared/use-data-source-actions';

export default function WelcomePage({
  open,
  busy: analyzing,
}: {
  open: (dataset: Dataset) => void;
  busy: boolean;
}) {
  const sourceActions = useDataSourceActions({ onImported: open, onConnected: open });
  const { busy, importData, connection } = sourceActions;
  return (
    <>
      <section className="w-full max-w-266 my-0 mx-auto max-[481px]:p-0 max-[481px]:mt-3">
        <DataSourcePicker
          importing={busy === 'import'}
          disabled={!!busy || analyzing}
          onImport={importData}
          onConnect={() => connection()}
        />
      </section>
      <MySQLConnectionDialog {...sourceActions} />
    </>
  );
}

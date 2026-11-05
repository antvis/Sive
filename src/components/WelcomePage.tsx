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
      <section className="data-welcome data-welcome-first">
        <header>
          <div>
            <h2>欢迎使用 Sive</h2>
            <p>从第一份数据开始：导入本地文件或连接 MySQL，开启你的数据分析。</p>
          </div>
        </header>
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

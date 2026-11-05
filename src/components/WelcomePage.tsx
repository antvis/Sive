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
      <section className="w-full [&_header_>_.ui-button]:shrink-0 [&_header_>_.ui-button]:ml-auto [&_header_p]:mt-2 [&_header_p]:mr-0 [&_header_p]:mb-0 [&_header_p]:ml-0 [&_header_p]:text-muted [&_header_p]:text-label max-[481px]:p-0 max-[481px]:mt-3 max-w-266 my-0 mx-auto">
        <header className="flex items-start gap-y-4 gap-x-6 flex-wrap justify-center pt-4 pr-0 pb-2 pl-0 text-center">
          <div>
            <h2 className="m-0 text-[clamp(24px,_3vw,_32px)] font-semibold tracking-[-0.03em]">
              欢迎使用 Sive
            </h2>
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

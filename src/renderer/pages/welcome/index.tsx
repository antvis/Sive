import type { Dataset } from '@shared/contracts';
import DataSourcePicker from '@renderer/components/data/DataSourcePicker';
import MySQLConnectionDialog from '@renderer/components/data/MySQLConnectionDialog';
import { useDataSourceActions } from '@renderer/hooks/useDataSourceActions';

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
        <header className="pt-8 max-[481px]:pt-3">
          <h1 className="m-0 text-[26px] leading-[1.35] font-semibold tracking-[-0.03em] text-ink">
            欢迎使用 Sive
          </h1>
          <p className="mt-3 mb-0 max-w-150 text-body leading-[1.7] text-muted">
            选择下方的数据源，导入或连接后，即可提问并查看分析结果。
          </p>
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

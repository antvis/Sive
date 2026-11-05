import { useLocation, useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Button } from './ui';
import DataSourcePicker from './DataSourcePicker';
import MySQLConnectionDialog from './MySQLConnectionDialog';
import { useDataSourceActions } from '../shared/use-data-source-actions';
import { useWorkspace } from '../shared/workspace-context';
import { dataListReturnTo } from '../shared/routes';

export default function NewDataSourcePage() {
  const { open, busy: analyzing, state } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const back = () => navigate(dataListReturnTo(location.state?.returnTo));
  const actions = useDataSourceActions({ onImported: open, onConnected: back });
  return (
    <>
      <section className="w-full mt-1 [&_header_>_.ui-button]:shrink-0 [&_header_>_.ui-button]:ml-auto [&_header_p]:mt-2 [&_header_p]:mr-0 [&_header_p]:mb-0 [&_header_p]:ml-0 [&_header_p]:text-muted [&_header_p]:text-label max-[481px]:p-0 max-[481px]:mt-3">
        <header className="flex items-start justify-between gap-y-4 gap-x-6 flex-wrap">
          <div>
            <h2 className="m-0 text-[clamp(24px,_3vw,_32px)] font-semibold tracking-[-0.03em]">新增数据源</h2>
            <p>选择数据来源，导入本地文件或建立 MySQL 只读连接。</p>
          </div>
          <Button icon={<ArrowLeftIcon />} disabled={!!actions.busy} onClick={back}>
            返回数据源
          </Button>
        </header>
        <DataSourcePicker
          importing={actions.busy === 'import'}
          disabled={!!actions.busy || analyzing || !!state.refreshingSavedId}
          onImport={actions.importData}
          onConnect={() => actions.connection()}
        />
      </section>
      <MySQLConnectionDialog {...actions} />
    </>
  );
}

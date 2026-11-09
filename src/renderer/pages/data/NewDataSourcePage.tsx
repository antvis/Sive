import { useLocation, useNavigate } from 'react-router';
import DataSourcePicker from '@renderer/components/data/DataSourcePicker';
import MySQLConnectionDialog from '@renderer/components/data/MySQLConnectionDialog';
import { useDataSourceActions } from '@renderer/hooks/useDataSourceActions';
import { useWorkspace } from '@renderer/hooks/useWorkspace';
import { dataListReturnTo } from '@renderer/utils/routes';

export default function NewDataSourcePage() {
  const { open } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const back = () => navigate(dataListReturnTo(location.state?.returnTo));
  const actions = useDataSourceActions({ onImported: open, onConnected: back });
  return (
    <>
      <section className="w-full mt-1 max-[481px]:p-0 max-[481px]:mt-3">
        <DataSourcePicker
          importing={actions.busy === 'import'}
          disabled={!!actions.busy}
          onImport={actions.importData}
          onConnect={() => actions.connection()}
        />
      </section>
      <MySQLConnectionDialog {...actions} />
    </>
  );
}

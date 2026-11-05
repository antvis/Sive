import { useLocation, useNavigate } from 'react-router';
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
      <section className="w-full mt-1 max-[481px]:p-0 max-[481px]:mt-3">
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

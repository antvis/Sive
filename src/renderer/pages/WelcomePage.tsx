import { useI18n } from '../i18n';
import { WorkspacePage } from '../components/WorkspacePage';
import { DataSourcePicker } from './datasets/DataSourcePicker';

export function WelcomePage() {
  const i18n = useI18n();
  return (
    <WorkspacePage title={i18n('datasets.actions.add')} description={i18n('datasets.picker.description')}>
      <DataSourcePicker />
    </WorkspacePage>
  );
}

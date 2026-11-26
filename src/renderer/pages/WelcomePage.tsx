import { WorkspacePage } from '../components/WorkspacePage';
import { DataSourcePicker } from './datasets/DataSourcePicker';

export function WelcomePage() {
  return (
    <WorkspacePage title="添加数据源" description="导入本地文件，或连接数据库和云端应用。">
      <DataSourcePicker />
    </WorkspacePage>
  );
}

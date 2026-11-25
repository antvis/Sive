import { DataSourcePicker } from './datasets/DataSourcePicker';

export function WelcomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-7 pt-4 pb-12 lg:px-10 motion-safe:animate-fade-up">
      <header>
        <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight">添加数据源</h1>
        <p className="mt-2 mb-0 max-w-150 leading-[1.7] text-muted-foreground">
          导入本地文件，或连接数据库和云端应用。
        </p>
      </header>
      <DataSourcePicker />
    </div>
  );
}

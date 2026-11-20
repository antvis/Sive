import { DataSourcePicker } from './datasets/DataSourcePicker';

export function WelcomePage() {
  return (
    <div className="mx-auto px-6 pt-8 pb-12">
      <header>
        <h1 className="m-0 text-3xl leading-[1.35] font-semibold tracking-[-0.03em]">欢迎使用 Sive</h1>
        <p className="mt-3 mb-0 max-w-150 leading-[1.7] text-muted">
          选择下方的数据源，导入或连接后，即可提问并查看分析结果。
        </p>
      </header>
      <DataSourcePicker />
    </div>
  );
}

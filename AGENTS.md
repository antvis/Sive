# Sive 开发约定

## 项目与目录

- Sive 是基于 AntV AVA 的 Electron 桌面数据分析工作台；界面使用 React、TypeScript、Tailwind CSS，默认文案为简体中文。
- `src/renderer/`：页面、组件与前端状态。`router.tsx` 管理 React Router Hash 路由，`app.tsx` 组合 Provider，`layout.tsx` 管理工作区布局；页面切换使用路由，不能重新引入全局 `setPage`。
- 前端按职责归位：Provider 放 `components/app/`，React hooks 与 Context 放 `hooks/`，查询、订阅和偏好存取放 `data/`，纯辅助逻辑放 `utils/`，前端共用类型放 `types/`。hooks 不依赖组件或页面，data/utils 不依赖 React hooks 或组件；不重新引入混合职责的 `lib/`。
- `src/main/`：Electron 主进程；`ipc/` 接收命令，`services/` 组织业务，`data/` 管理 Drizzle + SQLite 持久化，`ai/` 集成 AVA 和 Vercel AI SDK。`src/preload/` 通过 contextBridge 暴露命令表接口。
- `src/main/data/db/DbService.ts` 管理连接与事务，`data/services/` 按设置、模型服务商、数据源和会话记录拆分读写。业务服务只接收所需的数据服务；消息终态与隐藏 snippet 由会话聚合在同一事务内写入。工作区状态组合不承担写入职责，不恢复全能 Repository。
- `src/shared/`：跨进程类型、输入校验、主题与公共逻辑。修改 API 时同步 `src/shared/contracts.ts`、`src/shared/commands.ts` 和主进程实现。renderer 和 shared 不得引入主进程运行时代码，公共组件不得依赖页面。
- 使用 pnpm，版本与 Node.js 要求以 `package.json` 为准。开发入口为 `pnpm dev`。

## 实现原则

- 先阅读相关实现，再做满足需求的最小完整改动。复用已有组件和依赖，不为局部功能新增并行框架或抽象层。
- 数据读取与缓存复用 TanStack Query，表格使用 TanStack Table，表单复用 React Hook Form 与 Zod，分栏复用 react-resizable-panels。
- 区分原始分析记录与收藏快照：原始结果不可因收藏刷新而改写；收藏展示和导出使用最新成功的 `savedView`，并保留正确标题、更新时间及空图表状态。
- 处理异步加载、失败、取消和重复操作；错误给出可理解的中文提示。不要为了 UI 验证发起真实付费模型请求或改写用户数据。
- 仅列出 AVA 和当前应用实际支持的数据能力；未实现的可选入口明确禁用，不能伪装成功。

## 样式与交互

- 能用 Tailwind 就用 Tailwind。语义颜色、字号和圆角维护在 `src/renderer/styles/index.css`；根字号 14px、间距单位 4px，字号与圆角使用偶数像素。使用完整类名，避免运行时拼接工具类。
- 布局间距优先使用 Tailwind 标准工具类和 4px 步进，细调使用 2px 步进。
- 使用 `src/renderer/utils/cx.ts` 合并条件类和覆盖；优先复用 `src/renderer/components/ui/` 以及已有共用样式模块。
- 自有 JSX 元素的样式写在元素自身；跨组件通过 `className`、内部元素样式入口或状态属性传递，不能在父容器依赖子组件类名或 DOM 层级覆盖样式。悬停和焦点联动使用具名 `group`/`peer`；Markdown、第三方 DOM 和分栏拖拽时的 iframe 保护可保留必要的选择器。
- 手写 CSS 限于全局基础、生成的 Markdown、第三方内容和动画。运行时计算的尺寸可保留内联样式；独立导出 HTML 的样式不依赖应用的 Tailwind 产物。
- 保持浅深色、窄窗口、键盘操作与焦点状态可用；仅图标按钮需要可访问名称，悬浮提示也应支持键盘聚焦。
- 图表在沙箱 iframe 中渲染。图表视口不应因 tooltip 出现页面滚动条；数据表格和 SQL 仍须可滚动。保留图表加载、失败、重试及离屏加载行为。

## 验证与清理

- **不要盲目新增测试目录或测试框架。** 除非用户明确要求。
- 默认只做与改动相关的最小验证，例如 `pnpm check`、`git diff --check`、目标文件格式检查和必要的页面手动验证。
- 未经用户明确批准，不运行全量测试、完整 CI、打包或其他耗时构建。不要默认执行会格式化整个仓库的 `pnpm format`。
- 每次迁移都要清理被替代的实现、无用导入、依赖、样式、配置和文档；删除前检查动态引用、选择器和导出等消费者。
- 临时预览资源不纳入交付，完成后清理。报告验证范围和未验证部分，不把模拟结果描述为真实端到端验证。

## 提交与交付

- 分支统一使用 `<type>/<简短英文描述>`，按用途选择 `feat/`、`fix/`、`refactor/`、`chore/`、`docs/` 等前缀，描述使用小写字母和连字符。
- 保留与当前任务无关的用户修改。每轮修改默认仅保留在本地；只有用户针对当前改动明确要求时才 commit 或推送，不能将此前的提交或 PR 授权延续到后续修改，也不能因已有 PR 就自动推送。提交信息应清晰说明目的。
- 不随日常功能或开发约定改动自动更新中英文 README；待产品功能基本完善后，仅在用户明确要求时统一更新。完成后简述改动、验证结果和未解决问题。
- `CLAUDE.md` 引用本文件作为共同规范，通用约定只维护在这里，避免两份规则漂移。

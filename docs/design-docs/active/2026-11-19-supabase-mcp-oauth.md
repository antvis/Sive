# Supabase MCP OAuth 实时查询设计

## 目标

Sive 不部署任何线上服务端，通过 Supabase 官方托管 MCP 完成 OAuth 动态客户端注册、PKCE 授权和 Token 刷新。用户选择项目后，继续使用现有 AVA Supabase Engine 实时查询 Management API，不保存数据快照。

## 方案决策

采用“MCP 负责 OAuth，AVA 负责实时查询”。

Supabase 官方 MCP 源码将 OAuth/PAT 提供的 `accessToken` 用作 Management API 凭据，因此项目列表和 SQL 查询可以继续复用 Management API 与 AVA Supabase Engine。

不采用以下方案：

- 自定义 MCP 查询 Engine：需要复制 AVA 的 SQL Dialect、schema、profile 和查询限制逻辑。
- Management OAuth App + Token Exchange 服务：需要部署 Sive 自有服务端。
- 本地快照或自动同步：不符合实时查询目标。

## 数据流

### 新增或重新授权连接

1. Renderer 请求主进程开始 Supabase OAuth。
2. 主进程使用 MCP TypeScript SDK 完成 OAuth 配置发现和动态客户端注册。
3. 主进程启动 Loopback 回调，并通过系统浏览器打开授权地址。
4. 回调校验 `state`，调用 `transport.finishAuth(params)` 完成 `code`、`iss` 校验和 Token 交换。
5. 主进程使用 Access Token 请求 Management API 项目列表。
6. Renderer 仅获得随机授权会话 ID 和脱敏后的项目列表，用户选择项目。
7. 测试或保存时，Renderer 仅传递授权会话 ID；主进程将对应 OAuth 凭据附加到数据源配置。
8. AVA Supabase Engine 完成连接测试、schema 和 profile 读取。

### 已保存数据源

预览、刷新、分析和分析建议之前，主进程先确保 Token 有效：

1. Token 在有效缓冲期内则直接使用。
2. 需要刷新时，通过 MCP SDK 刷新并立即持久化可能轮换的新 Token。
3. 将最新 Access Token 注入 AVA 配置。
4. AVA Supabase Engine 以 `read_only: true` 实时执行 SQL。

Token 刷新后，分析 Agent 使用新的凭据版本重建，避免继续使用旧 Access Token。

## 模块设计

### SupabaseOAuthService

仅负责：

- OAuth 生命周期和 Loopback 回调。
- DCR 客户端信息与 Token 的读取、保存和刷新。
- 未保存数据源的临时授权会话。
- 项目列表查询。
- 为已保存数据源提供有效 Access Token。

服务只依赖 DBConnection 和 Repositories。跨 DatasetService、AnalysisService 的编排放在 IPC 层。

### 持久化

复用 datasets 表经 `safeStorage` 加密的 `sourceConfig`，不新增数据库表。

在 Supabase options 中增加应用私有 `oauth` 字段，保存：

- 按 issuer 区分的 DCR 客户端信息。
- OAuth Tokens。
- 根据 Token 有效期计算的过期时间。

AVA 的 source schema 会拒绝额外字段，因此进入 AVA 前通过单一转换函数移除 `oauth`。返回 Renderer 时同时移除 `oauth` 和 `accessToken`。

Token 自动刷新使用专门的 repository 更新方法，仅更新加密配置，不修改数据源 `updatedAt`。

### IPC 与界面

新增开始 OAuth 的 IPC。现有 datasetTest/datasetSave 接收可选授权会话 ID。

SupabaseDialog 调整为：

- 连接 Supabase 按钮。
- 授权状态和项目选择器。
- 数据源名称。
- 测试连接和保存连接。

已有 PAT 数据源保持兼容；编辑时通过 OAuth 重新授权，与当前编辑需要重新填写凭据的行为一致。

## 安全约束

- Authorization Code + PKCE S256。
- 随机 `state` 并在回调中严格比较。
- 使用完整回调参数调用 `finishAuth(params)`，保留 issuer 校验。
- 同一时间只允许一个 OAuth 流程。
- Loopback 仅绑定 `127.0.0.1`，校验 Host、HTTP 方法和回调路径。
- 授权完成、取消或超时后立即关闭 Loopback 服务。
- 使用系统浏览器，不在 BrowserWindow 中登录。
- 不记录授权 URL、授权码、Token 或 OAuth 错误详情。
- Token 和 DCR 凭据不进入 Renderer、Preload 返回值或日志。
- 同一数据源的 Token 刷新使用 single-flight，避免 Refresh Token 轮换竞争。
- 所有 SQL 继续由 AVA 使用只读模式执行。

## 错误处理

- 用户取消、回调超时、state/issuer 不匹配：终止流程并清理临时状态。
- Refresh Token 失效或授权撤销：清理失效 Token，提示重新授权。
- Token 刷新失败：保留数据源配置，不将旧 Token 写入日志或错误详情。
- 临时授权会话仅保存在内存并设置超时，不持久化到 Renderer 可访问位置。

## 验证

### 自动化

- OAuth state 不匹配和回调超时。
- 数据源详情不包含 Token 或 OAuth 私有字段。
- AVA 输入不包含应用私有 OAuth 字段。
- Refresh Token 轮换后持久化新 Token。
- 并发刷新只执行一次。
- Token 刷新后分析 Agent 使用新凭据。
- 现有测试以及 `test`、`tsc`、`lint` 全部通过。

### 真实项目验证

- 浏览器授权、项目选择和连接保存成功。
- 应用重启后无需重新授权。
- 远端行变更后，预览和分析读取最新数据。
- 授权撤销后提示重新授权。
- Renderer、日志和错误消息中不出现 Token。

## 非目标

- 本地快照和自动同步。
- 多账号管理。
- 授权管理或撤销界面。
- 自定义 MCP 查询 Engine。
- 自动刷新数据库结构；新增表或字段仍由用户手动刷新数据源。

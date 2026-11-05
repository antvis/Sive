# Sive

**Explore data in natural language, with the analysis process and results in one workspace.**

Sive is an open-source desktop analytics tool built on [AntV AVA](https://ava.antv.vision/). Describe your question, inspect queries and calculated data, and explore interactive charts. Save useful analyses to refresh or export later.

It is designed for business data exploration, everyday metric analysis, and workflows that require checking SQL and supporting data.

[简体中文](README.md)

## Core capabilities

- **Manage your data**: Import CSV, Excel (XLSX), JSON and Parquet, or connect to MySQL. Test, edit and revalidate connections, and browse multiple database tables.
- **Analyze within each data source**: Each source has one tab with its conversation history in the sidebar. “New conversation” uses the current source or asks you to choose one. The data panel opens by default to show previews, fields and data semantics. Drag the divider to resize it; use the same button at the panel’s top-right corner to collapse or expand it.
- **Follow the analysis process**: See data preparation, query generation, SQL execution, corrections, summaries and chart rendering. Inspect durations, SQL and result data, or stop a task.
- **Save and reuse results**: Save useful analyses as cards with interactive charts, data and SQL. Refresh the data or return to the original conversation.

## Usage guide

### Download and install

Installer downloads: **coming soon**. Once available, choose the installer for your operating system here, install it and open Sive. Node.js and pnpm are not required. Until then, run from source using the development guide below.

**Video TODO**

Conversation drafts are saved locally and remain available after closing a tab. Closing a tab does not stop an analysis. Deleted conversations can be searched, restored or permanently removed in Settings → Deleted conversations. Restoring a conversation also restores its results and saved analyses. Deleting a data source permanently deletes all its conversations (including deleted conversations), drafts and saved analyses; export any results you want to keep first.

## Development guide

Install Node.js >=22.13.0 and [pnpm](https://pnpm.io/installation) 10.30.3, then run from the project directory:

```sh
pnpm install
pnpm run electron:install
pnpm dev
```

For subsequent launches, run `pnpm dev`. Development supports UI hot reload; main-process or backend changes restart the app, and preload changes reload the window.

| Command        | Purpose                                                       |
| -------------- | ------------------------------------------------------------- |
| `pnpm check`   | Check types                                                   |
| `pnpm build`   | Build the app                                                 |
| `pnpm package` | Generate an app bundle for the current platform in `release/` |

UI code lives in `src/`, business logic in `backend/`, desktop entry points in `electron/`, and cross-process shared code in `shared/`. Development and builds are configured in `electron.vite.config.ts`.

Pages use React Router hash routing, compatible with local file loading in packaged Electron. Routes are defined in `src/router.tsx`; `App.tsx` provides the layout and shared workspace state. Welcome, datasets, new data source, analysis, saved analyses, and settings have separate routes. URLs identify the current dataset, conversation, and analysis run, while the workspace retains tabs and question drafts.

Sive is licensed under the [MIT License](LICENSE). It is an independent project built on AntV AVA, not an official AntV distribution.

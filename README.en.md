# Sive

**Explore data in natural language, with the analysis process and results in one workspace.**

Sive is an open-source desktop analytics tool built on [AntV AVA](https://ava.antv.vision/). Describe your question, inspect queries and calculated data, and explore interactive charts. Save useful analyses to refresh or export later.

It is designed for business data exploration, everyday metric analysis, and workflows that require checking SQL and supporting data.

[简体中文](README.md)

## Core capabilities

- **Manage your data**: Import CSV, Excel (XLSX), JSON and Parquet, or connect to MySQL. Test, edit and revalidate connections, and browse multiple database tables.
- **Understand data before analyzing**: Inspect fields, primary keys, indexes and previews. Add business definitions and metrics to guide analysis.
- **Follow the analysis process**: See data preparation, query generation, SQL execution, corrections, summaries and chart rendering. Inspect durations, SQL and result data, or stop a task.
- **Save and reuse results**: Save useful analyses as cards with interactive charts, data and SQL. Refresh the data or return to the original conversation.

## Usage guide

### Download and install

Installer downloads: **coming soon**. Once available, choose the installer for your operating system here, install it and open Sive. Node.js and pnpm are not required. Until then, run from source using the development guide below.

**Video TODO**


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

Sive is licensed under the [MIT License](LICENSE). It is an independent project built on AntV AVA, not an official AntV distribution.

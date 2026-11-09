
# Development Guidelines

## Project Structure

Sive is a desktop data analysis workbench based on AntV AVA, built with Electron, React, TypeScript, Tailwind CSS.

- `src/main/`: Electron main process. Window lifecycle, SQLite, AI/analysis, file & DB I/O, IPC handlers. Owns all privileged Node/Electron APIs.
- `src/preload/`: ContextBridge-only bridge that exposes a typed `window.workbench` API and forwards main→renderer events. No Node/Electron API leaks to the page.
- `src/renderer/`: React UI (pages, components, hooks). Runs sandboxed with `contextIsolation` on; talks to main exclusively via `window.workbench`, never imports Node/Electron.
- `src/shared/`: Isomorphic types, zod schemas, command names, and pure helpers imported by both processes. Must stay free of Node, Electron, and DOM APIs.

MUST USE THE BESE PRACTICES OF ELECTRON APPLICATION.

## Code Style

- Add blank lines between methods and properties to keep the code visually loose.
- Use relative paths for imports instead of `@` aliases, except for top-level modules such as `shared`.

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

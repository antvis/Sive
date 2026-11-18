/**
 * `shared` module is a shared library that can be used in both the main process and the renderer process.
 * It contains common types, interfaces, and utility functions that are used across the application.
 *
 * Note:
 * - ONLY can import types and interfaces from this module, DO NOT import any code that has side effects or dependencies on Node.js or Electron APIs.
 * - DO NOT import any code that has dependencies on the main process or renderer process,
 *      as this module is intended to be used in both contexts.
 */

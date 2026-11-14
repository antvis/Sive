import type { ComponentType } from 'react';
import { MySQLConnectionDialog } from './MySQLConnectionDialog';

type SourceEditorProps = { datasetId?: string; onClose: () => void; onSaved?: () => void };

const editors = new Map<string, ComponentType<SourceEditorProps>>([['mysql', MySQLConnectionDialog]]);

export function getSourceEditor(type: string) {
  return editors.get(type);
}

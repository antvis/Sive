import { createContext } from 'react';
import type { ToolPart } from '../ai-elements/tool';

export type ToolPreviewTab = {
  id: string;
  title: string;
  call: ToolPart;
};

export const ToolPreviewContext = createContext<((tab: ToolPreviewTab) => void) | null>(null);

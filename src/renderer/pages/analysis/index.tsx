import { useState } from 'react';
import { Group, Panel } from 'react-resizable-panels';
import { ResizeHandle } from '../../components/ResizeHandle';
import { readWidth, saveWidth } from '../../utils';
import type { ModelProfile, Preferences } from '../../types';
import { ConversationPanel } from './ConversationPanel';
import { DatasetPanel } from './DatasetPanel';

type Props = {
  datasetId: string;
  datasetUpdatedAt?: string;
  conversationId: string | null;
  savedMessageIds: string[];
  onConversationChange: (id: string) => void;
  onBack: () => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

export function AnalysisPage({
  datasetId,
  datasetUpdatedAt,
  conversationId,
  savedMessageIds,
  onConversationChange,
  onBack,
  models,
  activeModelId,
  preferences,
}: Props) {
  const [conversationWidth] = useState(() => readWidth('sive.conversation-width', 380));
  return (
    <Group orientation="horizontal" className="h-full min-h-0 overflow-hidden">
      <Panel
        id="conversation"
        defaultSize={conversationWidth}
        minSize={280}
        maxSize="60%"
        className="h-full min-h-0"
        onResize={(size) => saveWidth('sive.conversation-width', size.inPixels)}
      >
        <ConversationPanel
          datasetId={datasetId}
          datasetUpdatedAt={datasetUpdatedAt}
          conversationId={conversationId}
          savedMessageIds={savedMessageIds}
          onConversationChange={onConversationChange}
          onBack={onBack}
          models={models}
          activeModelId={activeModelId}
          preferences={preferences}
        />
      </Panel>
      <ResizeHandle />
      <Panel id="dataset" minSize="40%" className="h-full min-h-0 min-w-0 flex-1">
        <DatasetPanel key={datasetId} datasetId={datasetId} defaultPageSize={preferences.previewPageSize} />
      </Panel>
    </Group>
  );
}

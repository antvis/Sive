import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { AnalysisPage } from '../pages/analysis';
import { getDatasetConversations } from '../utils';
import { useWorkspaceRouteContext } from './context';
import { analysisPath, routePaths } from './paths';

export function AnalysisRoute() {
  const { state, refresh } = useWorkspaceRouteContext();
  const { datasetId, conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationKey = useRef<string | null>(location.key);
  const dataset = state.datasets.find((item) => item.id === datasetId);
  const conversationId = routeConversationId === 'new' ? null : (routeConversationId ?? null);

  useEffect(() => {
    locationKey.current = location.key;
    return () => {
      locationKey.current = null;
    };
  }, [location.key]);

  if (!dataset) return <Navigate to={routePaths.datasets} replace />;

  const conversations = getDatasetConversations(state.conversations, dataset.id);
  if (conversationId && !conversations.some((conversation) => conversation.id === conversationId)) {
    return <Navigate to={analysisPath(dataset.id, conversations[0]?.id ?? null)} replace />;
  }

  const onConversationChange = async (id: string) => {
    if (id === conversationId) return;
    await refresh();
    // A pending creation must not navigate after this route changes or unmounts.
    if (locationKey.current !== location.key) return;
    void navigate(analysisPath(dataset.id, id), { replace: true });
  };

  return (
    <AnalysisPage
      datasetId={dataset.id}
      conversationId={conversationId}
      onConversationChange={onConversationChange}
      onBack={() => void navigate(routePaths.datasets)}
      savedMessageIds={state.snippets.map((snippet) => snippet.messageId)}
      models={state.models}
      activeModelId={state.activeModelId}
      preferences={state.preferences}
    />
  );
}

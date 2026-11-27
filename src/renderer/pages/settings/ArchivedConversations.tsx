import { i18n, useI18n } from '../../i18n';
import { ArchiveIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { clearConversationUnread } from '../../hooks/useConversationStatus';
import type { Conversation, DatasetSummary } from '../../types';
import { errorMessage } from '../../utils';
import { Input } from '../../components/ui/input';

type Props = { conversations: Conversation[]; datasets: DatasetSummary[] };

export function ArchivedConversations({ conversations, datasets }: Props) {
  useI18n();
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sourceName = (id: string) =>
    datasets.find((dataset) => dataset.id === id)?.name ?? i18n('datasets.notifications.deleted');
  const needle = query.trim().toLocaleLowerCase();
  const filtered = conversations.filter((conversation) =>
    `${conversation.title} ${sourceName(conversation.datasetId)}`.toLocaleLowerCase().includes(needle),
  );
  const groups = new Map<string, Conversation[]>();
  for (const conversation of filtered) {
    groups.set(conversation.datasetId, [...(groups.get(conversation.datasetId) ?? []), conversation]);
  }

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      toast.success(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!conversations.length) {
    return (
      <div className="grid justify-items-center px-6 py-14 text-center">
        <ArchiveIcon size={32} className="text-muted-foreground" />
        <h2 className="mt-4 mb-2 text-base font-medium">{i18n('settings.archived.empty.title')}</h2>
        <p className="m-0 text-muted-foreground">{i18n('settings.archived.empty.description')}</p>
      </div>
    );
  }

  return (
    <section>
      <Input
        type="search"
        aria-label={i18n('settings.archived.search.label')}
        className="mb-5 max-w-80"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={i18n('settings.archived.search.placeholder')}
      />
      {error && <p className="mt-0 text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-5">
        {[...groups].map(([datasetId, items]) => (
          <section key={datasetId}>
            <h2 className="mt-0 mb-2 text-base font-medium">
              {sourceName(datasetId)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {i18n('settings.archived.count', [items.length])}
              </span>
            </h2>
            <div className="rounded-2xl bg-page px-4">
              {items.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <strong
                      className="block truncate text-base font-medium [-webkit-app-region:no-drag]"
                      title={conversation.title}
                    >
                      {conversation.title}
                    </strong>
                    <time className="mt-1 block text-xs text-muted-foreground">
                      {i18n('settings.archived.archivedAt', [
                        new Date(conversation.archivedAt!).toLocaleString(i18n.locale),
                      ])}
                    </time>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={i18n('settings.archived.actions.purgeLabel', [conversation.title])}
                    title={i18n('settings.archived.actions.purgeLabel', [conversation.title])}
                    disabled={busy}
                    onClick={() => setDeleting(conversation)}
                  >
                    <Trash2Icon className="size-[16px]" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={i18n('settings.archived.actions.restoreLabel', [conversation.title])}
                    title={i18n('settings.archived.actions.restoreLabel', [conversation.title])}
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        () => window.workbench.conversationRestore(conversation.id),
                        i18n('settings.archived.notifications.restored'),
                      )
                    }
                  >
                    <RotateCcwIcon className="size-[16px]" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!groups.size && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {i18n('settings.archived.empty.search')}
        </p>
      )}
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={i18n('settings.archived.purgeTitle')}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>{i18n('common.actions.cancel')}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await window.workbench.conversationPurge([deleting!.id]);
                  clearConversationUnread(deleting!.id);
                  setDeleting(null);
                }, i18n('settings.archived.notifications.purged'))
              }
            >
              {i18n('settings.archived.actions.purge')}
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted-foreground">{i18n('settings.archived.purgeDescription')}</p>
      </Modal>
    </section>
  );
}

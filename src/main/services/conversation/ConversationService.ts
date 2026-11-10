import { WorkbenchError } from '@shared/errors';
import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../db';
import type { DatasetService } from '../data/DatasetService';
import { timestamp } from '../../utils/time';

export class ConversationService {
  constructor(
    private data: Repositories,
    private datasets: DatasetService,
    private change: () => void,
    private isRunning: (id: string) => boolean,
    private refreshingConversation: () => string | undefined,
    private afterArchive: (id: string) => void,
  ) {}

  get(id: string) {
    const conversation = this.data.conversations.get(id);
    if (!conversation) throw new WorkbenchError('CONFLICT', '会话不存在');
    return conversation;
  }

  list() {
    return this.data.conversations.list();
  }

  create(datasetId: string) {
    const conversation = this.data.database.write(() => {
      this.datasets.dataset(datasetId);
      const candidates = this.data.conversations.listByDatasetId(datasetId).filter((row) => !row.archivedAt);
      const occupied = new Set(this.data.messages.listConversationIds(candidates.map((row) => row.id)));
      const empty = candidates.find((row) => !occupied.has(row.id));
      if (empty) return empty;
      const now = timestamp();
      return this.data.conversations.insert({
        id: randomUUID(),
        datasetId,
        title: '新会话',
        createdAt: now,
        updatedAt: now,
      });
    });
    this.change();
    return conversation;
  }

  rename(id: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) throw new WorkbenchError('INVALID_INPUT', '请输入任务标题');
    const changed = this.data.database.write(() => {
      const conversation = this.get(id);
      if (conversation.title === nextTitle) return false;
      this.data.conversations.update(id, {
        title: nextTitle,
        updatedAt: timestamp(conversation.updatedAt),
      });
      return true;
    });
    if (changed) this.change();
  }

  archive(id: string) {
    if (this.isRunning(id)) throw new WorkbenchError('CONFLICT', '请先停止此会话的分析');
    this.assertNotRefreshing([id]);
    this.data.database.write(() => {
      this.get(id);
      if (this.data.messages.hasStatus(id, ['running', 'cancelling']))
        throw new WorkbenchError('CONFLICT', '请先停止此会话的分析');
      const now = timestamp();
      this.data.conversations.update(id, { archivedAt: now, updatedAt: now });
    });
    this.afterArchive(id);
    this.change();
  }

  restore(id: string) {
    this.data.database.write(() => {
      const conversation = this.data.conversations.get(id);
      if (!conversation?.archivedAt) throw new WorkbenchError('CONFLICT', '已归档会话不存在');
      this.data.conversations.update(id, { archivedAt: null, updatedAt: timestamp() });
    });
    this.change();
  }

  purge(ids: string[]) {
    this.assertNotRefreshing(ids);
    this.data.database.write(() => {
      for (const id of ids)
        if (!this.get(id).archivedAt) throw new WorkbenchError('CONFLICT', '只能永久删除已归档的会话');
      for (const id of ids) {
        const messageIds = this.data.messages.listIdsByConversationId(id);
        for (let offset = 0; offset < messageIds.length; offset += 500) {
          const batch = messageIds.slice(offset, offset + 500);
          for (const snippetId of this.data.snippets.listIdsByMessageIds(batch))
            this.data.snippets.remove(snippetId);
        }
        for (const messageId of messageIds) this.data.messages.remove(messageId);
        this.data.conversations.remove(id);
      }
    });
    try {
      this.data.database.checkpointDeletedContent();
    } finally {
      this.change();
    }
  }

  private assertNotRefreshing(ids: string[]) {
    const conversationId = this.refreshingConversation();
    if (conversationId && ids.includes(conversationId))
      throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
  }
}

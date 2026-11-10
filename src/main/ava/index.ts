import { AVA } from '@antv/ava';
import type { ConnectionService } from '../services/data/ConnectionService';
import type { LanguageModel } from 'ai';
import { businessSemantic } from '../ai/semantics';
import { type AVADataset, loadSource, sourceSchema } from './sources';

type AVAOptions = {
  dataset?: AVADataset;
  signal?: AbortSignal;
  connections?: ConnectionService;
  model?: LanguageModel;
};

export async function withAVA<T>(
  { dataset, signal, connections, model }: AVAOptions,
  operation: (ava: AVA) => Promise<T>,
): Promise<T> {
  const ava = new AVA({
    llm: {
      model: model || 'not-configured',
      maxRetries: 0,
    },
    engine: {
      type: 'duckdb',
      memoryLimit: '512MB',
      threads: 2,
      queryTimeoutMs: 30000,
    },
  });
  let operationFailed = false;
  try {
    signal?.throwIfAborted();
    if (dataset) {
      await loadSource(ava, dataset, connections);
      const connectionSchema = await sourceSchema(ava, dataset);
      if (connectionSchema) await ava.schema({}, () => connectionSchema);
      else await ava.schema();
      // Each operation has its own AVA instance; restore the saved profile so
      // both analysis modes and suggestions receive the saved observations.
      const profile = dataset.profile;
      if (profile) await ava.profile({}, () => profile);
      if (dataset.semantic || dataset.metrics?.length)
        await ava.semantic({}, () => businessSemantic(dataset.semantic, dataset.metrics));
    }
    signal?.throwIfAborted();
    return await operation(ava);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await ava.dispose();
    } catch (error) {
      if (!operationFailed) throw error;
    }
  }
}

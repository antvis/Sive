import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/DBConnection';

export class AnalysisService {
  constructor(_database: DBConnection, _repositories: Repositories) {}

  save(_input: unknown) {
    throw new Error('Not implemented');
  }

  getRun(_id: string) {
    throw new Error('Not implemented');
  }

  listSummaries() {
    throw new Error('Not implemented');
  }
}

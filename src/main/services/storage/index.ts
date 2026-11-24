import type { Repositories } from '../../db/repository';

export class StorageService {
  constructor(private repository: Repositories['storage']) {}

  clearWorkspace() {
    this.repository.clearWorkspace();
    try {
      this.repository.compactWorkspace();
    } catch (cause) {
      throw new Error('工作台记录已清除，暂时无法回收数据库空间', { cause });
    }
  }
}

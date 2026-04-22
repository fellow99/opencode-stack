import { BaseConnector } from './base';
import { OpencodeConfig } from './types';

export class K8sConnector extends BaseConnector {
  constructor(config: OpencodeConfig) {
    super(config);
  }

  public get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  public async connect(): Promise<void> {
    throw new Error('K8s connector is reserved for future versions');
  }
}

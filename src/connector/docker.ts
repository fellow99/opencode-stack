import { BaseConnector } from './base';
import { OpencodeConfig } from './types';

export class DockerConnector extends BaseConnector {
  constructor(config: OpencodeConfig) {
    super(config);
  }

  public get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  public async connect(): Promise<void> {
    throw new Error('Docker connector is reserved for future versions');
  }
}

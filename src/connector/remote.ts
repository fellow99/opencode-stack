import { BaseConnector } from './base';
import { ServerConfig } from './types';

export class RemoteConnector extends BaseConnector {
  constructor(config: ServerConfig, timeoutMs?: number) {
    if (!config.project) {
      throw new Error('Remote connector requires project path');
    }
    super(config, timeoutMs);
  }

  public get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  public async connect(): Promise<void> {
    const health = await this.healthCheck();
    if (!health.healthy) {
      throw new Error(`Remote connector ${this.id} health check failed`);
    }
    this.status.connected = true;
    this.status.lastCheck = Date.now();
    this.status.failureCount = 0;
    this.status.lastError = undefined;
  }
}

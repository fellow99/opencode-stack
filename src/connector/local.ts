import { BaseConnector } from './base';
import { ServerConfig } from './types';

export class LocalConnector extends BaseConnector {
  constructor(config: ServerConfig, timeoutMs?: number) {
    super(
      {
        ...config,
        type: 'local',
        host: '127.0.0.1',
        port: 4096,
      },
      timeoutMs,
    );
  }

  public get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  public async connect(): Promise<void> {
    const health = await this.healthCheck();
    if (!health.healthy) {
      throw new Error(`Local connector ${this.id} health check failed`);
    }
    this.status.connected = true;
    this.status.lastCheck = Date.now();
    this.status.failureCount = 0;
    this.status.lastError = undefined;
  }
}

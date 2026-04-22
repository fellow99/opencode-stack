import { BackendUnreachableError, NoAvailableBackendError } from '../types/errors';
import { DockerConnector } from './docker';
import { HealthCheckManager } from './health-check';
import { K8sConnector } from './k8s';
import { LocalConnector } from './local';
import { RemoteConnector } from './remote';
import { AppConfig, IConnector, OpencodeConfig } from './types';

export class ConnectorManager {
  private readonly connectors = new Map<string, IConnector>();
  private routeIndex = -1;
  private healthChecker?: HealthCheckManager;

  constructor(private readonly config: AppConfig) {}

  public async initialize(): Promise<void> {
    for (const server of this.config.opencodes) {
      if (server.enabled === false) {
        continue;
      }
      const connector = this.createConnector(server);
      this.connectors.set(connector.id, connector);
      try {
        await connector.connect();
      } catch (error) {
        connector.status.connected = false;
        connector.status.lastError = error instanceof Error ? error.message : 'Unknown connect error';
      }
    }
  }

  public async start(): Promise<void> {
    this.healthChecker = new HealthCheckManager(this.config.settings);
    for (const connector of this.connectors.values()) {
      this.healthChecker.start(connector);
    }
  }

  public async stop(): Promise<void> {
    this.healthChecker?.stopAll();
    for (const connector of this.connectors.values()) {
      await connector.disconnect();
    }
  }

  public get(id: string): IConnector | undefined {
    return this.connectors.get(id);
  }

  public getAll(): IConnector[] {
    return Array.from(this.connectors.values());
  }

  public getPrimary(): IConnector | undefined {
    return this.getAll().find((item) => item.config.primary);
  }

  public getConnected(): IConnector[] {
    return this.getAll().filter((item) => item.status.connected && !item.status.isolated && item.config.enabled !== false);
  }

  public selectForNewSession(): IConnector {
    const connected = this.getConnected();
    if (!connected.length) {
      throw new NoAvailableBackendError();
    }
    this.routeIndex = (this.routeIndex + 1) % connected.length;
    return connected[this.routeIndex];
  }

  public async proxyViaPrimary(path: string, method: string, body?: unknown, headers?: Record<string, string>): Promise<unknown> {
    const connector = this.getPrimary() ?? this.getConnected()[0];
    if (!connector) {
      throw new NoAvailableBackendError();
    }
    const response = await connector.proxy({ method, path, body, headers });
    return response.body;
  }

  private createConnector(server: OpencodeConfig): IConnector {
    switch (server.type) {
      case 'local':
        return new LocalConnector(server, this.config.settings?.healthCheckTimeout);
      case 'remote':
        return new RemoteConnector(server, this.config.settings?.healthCheckTimeout);
      case 'docker':
        return new DockerConnector(server);
      case 'k8s':
        return new K8sConnector(server);
      default:
        throw new BackendUnreachableError(server.name, 'Unknown connector type');
    }
  }
}

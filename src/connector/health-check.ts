import { IConnector, SettingsConfig } from './types';

export class HealthCheckManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly recoveryTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly settings: SettingsConfig = {}) {}

  public start(connector: IConnector): void {
    this.stop(connector);
    const interval = this.settings.healthCheckInterval ?? 30000;
    const threshold = this.settings.isolationThreshold ?? 3;

    const timer = setInterval(async () => {
      const health = await connector.healthCheck();
      connector.status.lastCheck = Date.now();

      if (health.healthy) {
        connector.status.connected = true;
        connector.status.isolated = false;
        connector.status.failureCount = 0;
        connector.status.lastError = undefined;
        return;
      }

      connector.status.failureCount += 1;
      connector.status.connected = false;
      connector.status.lastError = `Health check failed: ${connector.baseUrl}`;

      if (connector.status.failureCount >= threshold) {
        connector.status.isolated = true;
        this.stop(connector);
        this.startRecovery(connector);
      }
    }, interval);

    this.timers.set(connector.id, timer);
  }

  public stop(connector: IConnector): void {
    const timer = this.timers.get(connector.id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(connector.id);
    }
  }

  private startRecovery(connector: IConnector): void {
    const existing = this.recoveryTimers.get(connector.id);
    if (existing) {
      clearInterval(existing);
      this.recoveryTimers.delete(connector.id);
    }

    const recoveryInterval = this.settings.recoveryInterval ?? 60000;
    const timer = setInterval(async () => {
      const health = await connector.healthCheck();
      connector.status.lastCheck = Date.now();
      if (!health.healthy) {
        return;
      }

      connector.status.connected = true;
      connector.status.isolated = false;
      connector.status.failureCount = 0;
      connector.status.lastError = undefined;

      clearInterval(timer);
      this.recoveryTimers.delete(connector.id);
      this.start(connector);
    }, recoveryInterval);

    this.recoveryTimers.set(connector.id, timer);
  }

  public stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    for (const timer of this.recoveryTimers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.recoveryTimers.clear();
  }
}

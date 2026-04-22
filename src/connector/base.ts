import { randomUUID } from 'node:crypto';
import { BackendUnreachableError } from '../types/errors';
import {
  ConnectorStatus,
  HealthInfo,
  IConnector,
  ProxyRequest,
  ProxyResponse,
  ServerConfig,
  Unsubscribe,
} from './types';

export abstract class BaseConnector implements IConnector {
  protected readonly state: ConnectorStatus = {
    connected: false,
    isolated: false,
    failureCount: 0,
    lastCheck: undefined,
  };

  constructor(public readonly config: ServerConfig, private readonly timeoutMs: number = 5000) {}

  public get id(): string {
    return this.config.name;
  }

  public abstract get baseUrl(): string;

  public get status(): ConnectorStatus {
    return this.state;
  }

  public abstract connect(): Promise<void>;

  public async disconnect(): Promise<void> {
    this.state.connected = false;
  }

  public async dispose(): Promise<void> {
    await this.disconnect();
    this.state.connected = false;
  }

  public async healthCheck(): Promise<HealthInfo> {
    const startedAt = Date.now();
    try {
      const response = await this.forward({
        method: 'GET',
        path: '/global/health',
        headers: this.getAuthHeaders(),
      });
      const body = response.body as { healthy?: boolean; version?: string };
      const healthy = response.status >= 200 && response.status < 300 && body.healthy !== false;
      return {
        healthy,
        version: body.version ?? 'unknown',
        responseTime: Date.now() - startedAt,
      };
    } catch {
      return {
        healthy: false,
        version: 'unknown',
        responseTime: Date.now() - startedAt,
      };
    }
  }

  public async proxy(request: ProxyRequest): Promise<ProxyResponse> {
    return this.forward(request);
  }

  public subscribeEvents(callback: (event: unknown) => void): Unsubscribe {
    const controller = new AbortController();
    const sseUrl = new URL('/event', this.baseUrl);
    let reconnectAttempts = 0;
    const maxReconnect = 3;

    const connect = async (): Promise<void> => {
      if (controller.signal.aborted) {
        return;
      }

      try {
        const response = await fetch(sseUrl, {
          method: 'GET',
          headers: {
            ...this.getAuthHeaders(),
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.body) {
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim();
              if (!raw) {
                continue;
              }
              try {
                callback(JSON.parse(raw));
              } catch {
                callback(raw);
              }
            }
          }
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }

      if (!controller.signal.aborted && reconnectAttempts < maxReconnect) {
        reconnectAttempts += 1;
        setTimeout(() => {
          void connect();
        }, 1000);
      }
    };

    void connect();

    return () => {
      controller.abort();
    };
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.config.username || !this.config.password) {
      return {};
    }
    const basic = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    return {
      Authorization: `Basic ${basic}`,
    };
  }

  private async forward(request: ProxyRequest): Promise<ProxyResponse> {
    const url = new URL(request.path, this.baseUrl);
    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        if (typeof value === 'string') {
          url.searchParams.set(key, value);
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        }
      }
    }

    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
      ...(request.headers ?? {}),
    };

    const method = request.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'DELETE' && request.body !== undefined;

    if (hasBody && !headers['content-type'] && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: hasBody
          ? headers['content-type']?.includes('application/json') || headers['Content-Type']?.includes('application/json')
            ? JSON.stringify(request.body)
            : String(request.body)
          : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') ?? '';
      const body = contentType.includes('application/json') ? await response.json() : await response.text();
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : randomUUID();
      throw new BackendUnreachableError(this.id, message);
    } finally {
      clearTimeout(timeout);
    }
  }
}

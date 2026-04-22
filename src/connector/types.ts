export type ConnectorType = 'local' | 'remote' | 'docker' | 'k8s';

export interface ServerConfig {
  host?: string;
  port?: number;
  cors?: string[] | boolean;
}

export interface OpencodeConfig {
  name: string;
  type: ConnectorType;
  host: string;
  port: number;
  project?: string;
  username?: string;
  password?: string;
  enabled?: boolean;
  primary?: boolean;
}

export interface ConnectorStatus {
  connected: boolean;
  isolated: boolean;
  failureCount: number;
  lastError?: string;
  lastCheck?: number;
}

export interface HealthInfo {
  healthy: boolean;
  version: string;
  responseTime: number;
}

export interface ProxyRequest {
  method: string;
  path: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export type Unsubscribe = () => void;

export interface IConnector {
  readonly id: string;
  readonly config: OpencodeConfig;
  readonly status: ConnectorStatus;
  readonly baseUrl: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  dispose(): Promise<void>;
  healthCheck(): Promise<HealthInfo>;
  proxy(request: ProxyRequest): Promise<ProxyResponse>;
  subscribeEvents(callback: (event: unknown) => void): Unsubscribe;
}

export interface SettingsConfig {
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  isolationThreshold?: number;
  recoveryInterval?: number;
  sseReconnectMax?: number;
  sseGracefulShutdownDelay?: number;
}

export interface AppConfig {
  server?: ServerConfig;
  opencodes: OpencodeConfig[];
  settings?: SettingsConfig;
}

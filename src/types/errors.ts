export class ConnectorError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class NoAvailableBackendError extends ConnectorError {
  constructor() {
    super('No available backend', 'NO_AVAILABLE_BACKEND');
  }
}

export class BackendUnreachableError extends ConnectorError {
  public readonly backend: string;

  constructor(backend: string, detail?: string) {
    super(detail ? `Backend ${backend} unreachable: ${detail}` : `Backend ${backend} unreachable`, 'BACKEND_UNREACHABLE');
    this.backend = backend;
  }
}

export class SessionNotFoundError extends ConnectorError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND');
  }
}

import express from 'express';
import { ConnectorManager, IConnector } from '../connector';
import { BackendUnreachableError, NoAvailableBackendError, SessionNotFoundError } from '../types/errors';
import { SessionRouteTable } from './session/route-table';

interface ApiContext {
  connectorManager: ConnectorManager;
  sessionRouteTable: SessionRouteTable;
}

function toHeaders(input: express.Request['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function normalizePath(req: express.Request): string {
  return req.path;
}

function getSessionIdFromPath(path: string): string | undefined {
  const match = path.match(/^\/session\/([^/]+)/);
  return match?.[1];
}

function isAggregatePath(method: string, path: string): boolean {
  const key = `${method.toUpperCase()} ${path}`;
  const exact = new Set([
    'GET /global/health',
    'GET /project',
    'GET /session',
    'GET /session/status',
    'GET /provider',
    'GET /provider/auth',
    'GET /agent',
    'GET /command',
    'GET /skill',
  ]);
  return exact.has(key);
}

function isBroadcastPath(method: string, path: string): boolean {
  const upperMethod = method.toUpperCase();
  if (path === '/log' && upperMethod === 'POST') {
    return true;
  }
  if (path === '/global/dispose' && upperMethod === 'POST') {
    return true;
  }
  return /^\/auth\/[^/]+$/.test(path);
}

function isPrimaryPath(path: string): boolean {
  if (path === '/project/current' || path === '/path') {
    return true;
  }
  if (path === '/config' || path === '/config/providers') {
    return true;
  }
  if (path === '/global/config') {
    return true;
  }
  return /^\/provider\/[^/]+\/oauth\/(authorize|callback)$/.test(path);
}

function isLocalPath(path: string): boolean {
  return path === '/health' || path === '/doc' || path.startsWith('/x/');
}

function mergeBodies(path: string, bodies: unknown[]): unknown {
  if (path === '/session') {
    return bodies.flatMap((item) => (Array.isArray(item) ? item : []));
  }

  if (path === '/session/status') {
    const merged: Record<string, unknown> = {};
    for (const body of bodies) {
      if (body && typeof body === 'object') {
        Object.assign(merged, body);
      }
    }
    return merged;
  }

  if (path === '/provider') {
    const all: unknown[] = [];
    const defaults: Record<string, string> = {};
    const connected = new Set<string>();

    for (const body of bodies) {
      if (!body || typeof body !== 'object') {
        continue;
      }
      const parsed = body as { all?: unknown[]; default?: Record<string, string>; connected?: string[] };
      if (Array.isArray(parsed.all)) {
        all.push(...parsed.all);
      }
      if (parsed.default && typeof parsed.default === 'object') {
        Object.assign(defaults, parsed.default);
      }
      if (Array.isArray(parsed.connected)) {
        for (const id of parsed.connected) {
          connected.add(id);
        }
      }
    }

    return {
      all,
      default: defaults,
      connected: Array.from(connected),
    };
  }

  if (path === '/provider/auth') {
    const merged: Record<string, unknown> = {};
    for (const body of bodies) {
      if (body && typeof body === 'object') {
        Object.assign(merged, body);
      }
    }
    return merged;
  }

  if (path === '/project' || path === '/agent' || path === '/command' || path === '/skill') {
    return bodies.flatMap((item) => (Array.isArray(item) ? item : []));
  }

  if (path === '/global/health') {
    return {
      healthy: bodies.length > 0,
      version: 'opencode-stack',
      backends: bodies,
    };
  }

  return bodies[0] ?? null;
}

async function proxyWithConnector(connector: IConnector, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const result = await connector.proxy({
    method: req.method,
    path: normalizePath(req),
    query: req.query as Record<string, string | string[] | undefined>,
    headers: toHeaders(req.headers),
    body: req.body,
  });
  return result;
}

async function handleAggregate(ctx: ApiContext, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const connectors = ctx.connectorManager.getConnected();
  if (!connectors.length) {
    throw new NoAvailableBackendError();
  }
  const settled = await Promise.allSettled(connectors.map((connector) => proxyWithConnector(connector, req)));
  const ok = settled.filter((result): result is PromiseFulfilledResult<{ status: number; headers: Record<string, string>; body: unknown }> => result.status === 'fulfilled');
  if (!ok.length) {
    throw new BackendUnreachableError('aggregate');
  }
  const first = ok[0].value;
  const bodies = ok.map((item) => item.value.body);
  return {
    status: first.status,
    headers: first.headers,
    body: mergeBodies(req.path, bodies),
  };
}

async function handleBroadcast(ctx: ApiContext, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const connectors = ctx.connectorManager.getConnected();
  if (!connectors.length) {
    throw new NoAvailableBackendError();
  }
  const settled = await Promise.allSettled(connectors.map((connector) => proxyWithConnector(connector, req)));
  const firstSuccess = settled.find((item): item is PromiseFulfilledResult<{ status: number; headers: Record<string, string>; body: unknown }> => item.status === 'fulfilled');
  if (!firstSuccess) {
    throw new BackendUnreachableError('broadcast');
  }
  return firstSuccess.value;
}

async function handlePrimary(ctx: ApiContext, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const connector = ctx.connectorManager.getPrimary() ?? ctx.connectorManager.getConnected()[0];
  if (!connector) {
    throw new NoAvailableBackendError();
  }
  return proxyWithConnector(connector, req);
}

async function handleSession(ctx: ApiContext, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const path = normalizePath(req);
  const sessionId = getSessionIdFromPath(path);
  if (!sessionId) {
    throw new SessionNotFoundError('unknown');
  }

  const connectorId = ctx.sessionRouteTable.lookup(sessionId);
  if (!connectorId) {
    throw new SessionNotFoundError(sessionId);
  }

  const connector = ctx.connectorManager.get(connectorId);
  if (!connector || !connector.status.connected) {
    throw new BackendUnreachableError(connectorId);
  }
  return proxyWithConnector(connector, req);
}

async function handleCreateSession(ctx: ApiContext, req: express.Request): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const connector = ctx.connectorManager.selectForNewSession();
  const result = await proxyWithConnector(connector, req);
  if (result.body && typeof result.body === 'object') {
    const payload = result.body as { id?: string };
    if (payload.id) {
      ctx.sessionRouteTable.register(payload.id, connector.id);
    }
  }
  return result;
}

function respondProxy(res: express.Response, payload: { status: number; headers: Record<string, string>; body: unknown }): void {
  for (const [key, value] of Object.entries(payload.headers)) {
    const lower = key.toLowerCase();
    if (lower === 'content-length' || lower === 'connection' || lower === 'transfer-encoding' || lower === 'content-encoding') {
      continue;
    }
    res.setHeader(key, value);
  }
  res.status(payload.status);
  const contentType = payload.headers['content-type'] ?? payload.headers['Content-Type'] ?? '';
  if (typeof payload.body === 'string' && !contentType.includes('application/json')) {
    res.send(payload.body);
    return;
  }
  res.json(payload.body);
}

function respondError(res: express.Response, error: unknown): void {
  if (error instanceof SessionNotFoundError) {
    res.status(404).json({ error: { message: error.message, code: error.code } });
    return;
  }
  if (error instanceof NoAvailableBackendError) {
    res.status(503).json({ error: { message: error.message, code: error.code } });
    return;
  }
  if (error instanceof BackendUnreachableError) {
    res.status(502).json({ error: { message: error.message, code: error.code, backend: error.backend } });
    return;
  }
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  res.status(500).json({ error: { message, code: 'INTERNAL_ERROR' } });
}

export function createApiRouter(ctx: ApiContext): express.Router {
  const router = express.Router();

  router.get('/x/backends', (_req, res) => {
    const backends = ctx.connectorManager.getAll().map((connector) => ({
      id: connector.id,
      type: connector.config.type,
      baseUrl: connector.baseUrl,
      status: connector.status,
    }));
    res.json(backends);
  });

  router.get('/x/routes', (_req, res) => {
    res.json(ctx.sessionRouteTable.getAll());
  });

  router.get('/x/sse', (_req, res) => {
    res.json({
      note: 'SSE aggregation is connector-level in v0.1',
      connectors: ctx.connectorManager.getConnected().map((item) => item.id),
    });
  });

  router.get('/doc', (_req, res) => {
    res.json({
      openapi: '3.1.0',
      info: {
        title: 'opencode-stack compatibility gateway',
        version: process.env.npm_package_version ?? '0.1.0',
      },
      note: 'Proxy-compatible with opencode server API routes.',
    });
  });

  router.all('*', async (req, res) => {
    try {
      const path = normalizePath(req);

      if (path === '/session' && req.method.toUpperCase() === 'POST') {
        const created = await handleCreateSession(ctx, req);
        respondProxy(res, created);
        return;
      }

      if (/^\/session\/[^/]+/.test(path)) {
        const result = await handleSession(ctx, req);
        if (req.method.toUpperCase() === 'DELETE' && /^\/session\/[^/]+$/.test(path) && result.body === true) {
          const sessionId = getSessionIdFromPath(path);
          if (sessionId) {
            ctx.sessionRouteTable.clear(sessionId);
          }
        }
        respondProxy(res, result);
        return;
      }

      if (isLocalPath(path)) {
        res.status(404).json({ error: { message: 'Unsupported local endpoint', code: 'NOT_IMPLEMENTED' } });
        return;
      }

      if (isAggregatePath(req.method, path)) {
        const result = await handleAggregate(ctx, req);
        respondProxy(res, result);
        return;
      }

      if (isBroadcastPath(req.method, path)) {
        const result = await handleBroadcast(ctx, req);
        respondProxy(res, result);
        return;
      }

      if (isPrimaryPath(path)) {
        const result = await handlePrimary(ctx, req);
        respondProxy(res, result);
        return;
      }

      const current = ctx.connectorManager.getConnected()[0];
      if (!current) {
        throw new NoAvailableBackendError();
      }
      const result = await proxyWithConnector(current, req);
      respondProxy(res, result);
    } catch (error) {
      respondError(res, error);
    }
  });

  return router;
}

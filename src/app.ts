import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import { createApiRouter } from './api/router';
import { loadAppConfig } from './config/loader';
import { ConnectorManager } from './connector';
import { SessionRouteTable } from './api/session/route-table';
import { logger, errorLogger, requestLoggingMiddleware } from './util/logger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggingMiddleware);

// Routes
import indexRouter from './routes/index';
app.use('/', indexRouter);

function parseConfigPath(argv: string[]): string | undefined {
  let configPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-c' || arg === '--config') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for -c/--config');
      }
      configPath = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length).trim();
      if (!value) {
        throw new Error('Missing value for --config');
      }
      configPath = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return configPath;
}

function resolveCorsConfig(corsConfig: string[] | boolean | undefined): cors.CorsOptions | undefined {
  if (corsConfig === undefined || corsConfig === null || corsConfig === false || (Array.isArray(corsConfig) && corsConfig.length === 0)) {
    return undefined;
  }
  if (corsConfig === true) {
    return { origin: true };
  }
  return { origin: corsConfig };
}

async function bootstrap(): Promise<void> {
  const configPath = parseConfigPath(process.argv.slice(2));
  const config = await loadAppConfig(configPath);

  const corsOptions = resolveCorsConfig(config.server?.cors);
  if (corsOptions) {
    app.use(cors(corsOptions));
    logger.info('CORS enabled with origins: %s', corsOptions.origin === true ? '*' : JSON.stringify(corsOptions.origin));
  }

  const connectorManager = new ConnectorManager(config);
  await connectorManager.initialize();
  await connectorManager.start();

  const sessionRouteTable = new SessionRouteTable();
  app.use('/', createApiRouter({ connectorManager, sessionRouteTable }));

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    errorLogger.error('[Error] %s', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const host = config.server?.host ?? '0.0.0.0';
  const port = config.server?.port ?? Number(process.env.PORT) ?? 6904;

  app.listen(port, host, () => {
    logger.info('opencode-stack listening on http://%s:%d', host === '0.0.0.0' ? 'localhost' : host, port);
  });

  const shutdown = async () => {
    await connectorManager.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  errorLogger.error('[Startup Error] %s', message);
  process.exit(1);
});

export default app;

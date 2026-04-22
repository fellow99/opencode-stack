import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ZodError } from 'zod';
import { AppConfig } from '../connector/types';
import { AppConfigSchema } from './schema';

function resolvePassword(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const envPattern = /^\$\{([A-Z0-9_]+)\}$/;
  const match = raw.match(envPattern);
  if (!match) {
    return raw;
  }
  return process.env[match[1]];
}

function normalizeInput(input: AppConfig): AppConfig {
  return {
    server: input.server ?? {},
    opencodes: (input.opencodes ?? []).map((server) => ({
      ...server,
      username: server.username ?? 'opencode',
      enabled: server.enabled ?? true,
      primary: server.primary ?? false,
      password: resolvePassword(server.password),
    })),
  } as AppConfig;
}

function formatValidationError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ');
}

export async function loadAppConfig(configPath?: string): Promise<AppConfig> {
  const defaultConfig: AppConfig = {
    server: {},
    opencodes: [
      {
        name: 'local',
        type: 'local',
        host: '127.0.0.1',
        port: 4096,
        enabled: true,
        primary: true,
      },
    ],
  };

  const explicitPath = typeof configPath === 'string' && configPath.trim().length > 0;
  const resolvedPath = explicitPath
    ? path.resolve(process.cwd(), configPath)
    : path.resolve(process.cwd(), 'config.yaml');

  try {
    const content = await fs.readFile(resolvedPath, 'utf8');
    let parsed: unknown;

    try {
      parsed = parseYaml(content) as unknown;
    } catch (error) {
      if (!explicitPath) {
        return AppConfigSchema.parse(normalizeInput(defaultConfig));
      }
      const message = error instanceof Error ? error.message : 'unknown YAML parse error';
      throw new Error(`Invalid YAML config file (${resolvedPath}): ${message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      if (!explicitPath) {
        return AppConfigSchema.parse(normalizeInput(defaultConfig));
      }
      throw new Error(`Config file (${resolvedPath}) is empty or invalid object`);
    }

    try {
      return AppConfigSchema.parse(normalizeInput(parsed as AppConfig));
    } catch (error) {
      if (!explicitPath) {
        return AppConfigSchema.parse(normalizeInput(defaultConfig));
      }
      if (error instanceof ZodError) {
        throw new Error(`Config validation failed (${resolvedPath}): ${formatValidationError(error)}`);
      }
      throw error;
    }
  } catch (error) {
    if (!explicitPath) {
      return AppConfigSchema.parse(normalizeInput(defaultConfig));
    }
    const message = error instanceof Error ? error.message : 'unknown read error';
    throw new Error(`Cannot load config file (${resolvedPath}): ${message}`);
  }
}

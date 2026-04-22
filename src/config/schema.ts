import { z } from 'zod';

export const OpencodeConfigSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(['local', 'remote', 'docker', 'k8s']),
    host: z.string().min(1),
    port: z.number().int().positive().default(4096),
    project: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    enabled: z.boolean().default(true),
    primary: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'remote' && !value.project) {
      ctx.addIssue({ code: 'custom', message: 'project is required for remote connector' });
    }
  });

export const ServerConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  cors: z.union([z.array(z.string()), z.boolean()]).optional(),
});

export const AppConfigSchema = z.object({
  server: ServerConfigSchema.optional(),
  opencodes: z.array(OpencodeConfigSchema).min(1),
  settings: z
    .object({
      healthCheckInterval: z.number().int().positive().default(30000),
      healthCheckTimeout: z.number().int().positive().default(5000),
      isolationThreshold: z.number().int().positive().default(3),
      recoveryInterval: z.number().int().positive().default(60000),
      sseReconnectMax: z.number().int().positive().default(3),
      sseGracefulShutdownDelay: z.number().int().positive().default(30000),
    })
    .optional(),
});

export type AppConfigInput = z.infer<typeof AppConfigSchema>;

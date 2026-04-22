import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'opencode-stack',
    version: process.env.npm_package_version || '0.1.0',
    description: 'opencode aggregation service',
  });
});

export default router;

import { Router } from 'express';
import { getProviderRegistry } from '../../core/aiProviders';

export const providersRouter = Router();

providersRouter.get('/providers', (_req, res) => {
  res.json({ providers: getProviderRegistry() });
});

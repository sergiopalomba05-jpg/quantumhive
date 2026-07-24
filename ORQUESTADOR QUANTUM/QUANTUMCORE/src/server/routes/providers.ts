import { Router } from 'express';
import { getProviderRegistry } from '../../core/aiProviders';

export const providersRouter = Router();

providersRouter.get('/providers', (_req, res) => {
  res.json({ providers: getProviderRegistry() });
});

providersRouter.get('/providers/:id/models', (req, res) => {
  const provider = getProviderRegistry().find((item) => item.id === req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'provider not found' });
    return;
  }

  res.json({ models: provider.models });
});

providersRouter.post('/providers/:id/test', (req, res) => {
  const provider = getProviderRegistry().find((item) => item.id === req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'provider not found' });
    return;
  }

  if (provider.status === 'requires_runner') {
    res.json({ status: provider.status, message: 'Este proveedor requiere runner local/VM antes de ejecutarse.' });
    return;
  }

  if (provider.status === 'needs_secret') {
    res.json({ status: provider.status, message: `Configura ${provider.secretRef} en el backend para activar este proveedor.` });
    return;
  }

  res.json({ status: provider.status, message: 'Proveedor disponible para el router.' });
});

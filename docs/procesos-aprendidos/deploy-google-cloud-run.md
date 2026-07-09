# Deploy a Google Cloud Run - Node.js/Express

## Checklist Pre-Deploy

### 1. Puerto variable (CRITICAL)
```typescript
// MAL - hardcodeado
const PORT = 3000;

// BIEN - usa variable de entorno de Cloud Run
const PORT = parseInt(process.env.PORT || "8080", 10);
```
Cloud Run asigna el puerto via `process.env.PORT`. Si lo hardcodeas, el health check TCP falla y la revisión nunca levanta.

### 2. Escuchar en 0.0.0.0
```typescript
app.listen(PORT, "0.0.0.0", () => { ... });
```
Nunca usar `localhost` o `127.0.0.1` — Cloud Run no puede redirigir tráfico a esas interfaces.

### 3. .gcloudignore - NO excluir el server bundle
Si usas esbuild con output `.cjs`, **NO** pongas `*.cjs` en `.gcloudignore`. El patrón `!dist/` no siempre sobreescribe la exclusión a nivel de archivo.

```gitignore
# .gcloudignore correcto para Node.js con esbuild
node_modules
.env
.env.*
src/
*.ts
!dist/
dist/*.map
!dist/server.cjs
tsconfig.json
vite.config.ts
README.md
.git
.gitignore
```

### 4. Dockerfile mínimo
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
```

### 5. package.json scripts
```json
{
  "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
  "start": "node dist/server.cjs"
}
```

## Comando de Deploy
```bash
gcloud run deploy SERVICE_NAME \
  --source . \
  --region us-central1 \
  --project PROJECT_ID \
  --allow-unauthenticated
```

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `Failed to start and listen on PORT=8080` | Puerto hardcodeado o `0.0.0.0` faltante | Usar `process.env.PORT` y `0.0.0.0` |
| `Cannot find module '/app/dist/server.cjs'` | `.gcloudignore` excluye `.cjs` | Remover `*.cjs` de `.gcloudignore` |
| `ERR_MODULE_REQUIRE` | Output `.js` con `"type": "module"` en package.json | Usar extensión `.cjs` para CommonJS |
| `Connection failed with status CANCELLED` | App crashea al iniciar | Revisar logs con `gcloud logging read` |

## Ver Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME" --limit=20 --format="value(textPayload)"
```

## Ver URL del Servicio
```bash
gcloud run services describe SERVICE_NAME --region us-central1 --format="value(status.url)"
```

FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build Vite frontend
RUN npx vite build

# Compile HF server
RUN npx esbuild server.hf.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs

# ---- Runtime ----
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/menu.json ./src/menu.json
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist/server.cjs"]

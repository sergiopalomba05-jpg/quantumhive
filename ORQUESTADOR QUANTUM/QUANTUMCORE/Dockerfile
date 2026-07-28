FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app

# Install Python for Memanto sidecar
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && \
    python3 -m venv /opt/memanto-venv && \
    /opt/memanto-venv/bin/pip install --no-cache-dir memanto && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PM2 globally for process management
RUN npm install -g pm2

COPY --from=build /app/dist ./dist
COPY --from=build /app/docs ./docs
COPY --from=build /app/graphify-out ./graphify-out
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# PM2 ecosystem config for running Node + Memanto together
RUN echo '{ \
  "apps": [ \
    { \
      "name": "quantumcore", \
      "script": "dist/server.cjs", \
      "env": { "NODE_ENV": "production", "PORT": "8080" } \
    }, \
    { \
      "name": "memanto", \
      "interpreter": "/opt/memanto-venv/bin/python3", \
      "script": "/opt/memanto-venv/bin/memanto", \
      "args": "serve --port 8000", \
      "env": { "MEMANTO_PORT": "8000" } \
    } \
  ] \
}' > ecosystem.config.json

ENV NODE_ENV=production
ENV PORT=8080
ENV GRAPHIFY_PATH=/app/graphify-out/graph.json
ENV MEMANTO_URL=http://localhost:8000
EXPOSE 8080

CMD ["pm2-runtime", "ecosystem.config.json"]

FROM node:20-slim AS build
WORKDIR /app
COPY "ORQUESTADOR QUANTUM/package.json" "ORQUESTADOR QUANTUM/package-lock.json" ./
RUN npm ci --legacy-peer-deps
COPY "ORQUESTADOR QUANTUM/" .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
RUN npm ci --omit=dev --legacy-peer-deps
EXPOSE 8080
CMD ["node", "dist/server.cjs"]

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/docs ./docs
COPY --from=build /app/graphify-out ./graphify-out
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

ENV NODE_ENV=production
ENV PORT=8080
ENV GRAPHIFY_PATH=/app/graphify-out/graph.json
EXPOSE 8080

CMD ["node", "dist/server.cjs"]

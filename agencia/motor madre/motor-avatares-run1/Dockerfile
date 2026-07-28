FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_CLOUD_PROJECT=bubbly-stone-502214-u7
ENV GOOGLE_CLOUD_LOCATION=us-central1

EXPOSE 8080

CMD ["node", "dist/server.cjs"]

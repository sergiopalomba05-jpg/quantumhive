FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=8080
ENV GOOGLE_CLOUD_PROJECT=project-aa5fb956-b08a-4e13-869
ENV GOOGLE_CLOUD_LOCATION=us-central1

EXPOSE 8080

CMD ["node", "dist/server.cjs"]

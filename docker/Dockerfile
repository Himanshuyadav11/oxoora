FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/product-uploads

COPY package*.json ./
RUN npm ci --omit=dev

COPY admin-app ./admin-app
COPY server ./server
COPY src/assets ./src/assets
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data /app/product-uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

VOLUME ["/app/data", "/app/product-uploads"]

CMD ["node", "server/admin-server.js"]

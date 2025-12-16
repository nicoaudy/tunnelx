FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY server/ ./server/
COPY shared/ ./shared/

EXPOSE 443

CMD ["bun", "run", "server/index.ts"]
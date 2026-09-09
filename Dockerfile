FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY prisma ./prisma
RUN test -f prisma/schema.prisma
RUN npm install
RUN npx prisma generate --schema=prisma/schema.prisma
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY next.config.mjs tailwind.config.ts postcss.config.mjs tsconfig.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "scripts/boot.cjs"]

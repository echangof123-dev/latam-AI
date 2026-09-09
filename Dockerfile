FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
COPY boot.cjs ./
COPY next.config.mjs ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./
RUN mkdir -p public
RUN test -f prisma/schema.prisma
RUN test -f boot.cjs
RUN npm install
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate --schema=prisma/schema.prisma && npx next build

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
COPY --from=build /app/boot.cjs ./
EXPOSE 3000
CMD ["node", "boot.cjs"]

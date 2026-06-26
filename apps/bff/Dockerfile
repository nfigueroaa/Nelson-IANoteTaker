FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/bff/package*.json ./apps/bff/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci --workspace=@nelson/bff --workspace=@nelson/shared-types

COPY packages/shared-types ./packages/shared-types
COPY apps/bff ./apps/bff

WORKDIR /app/apps/bff
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/bff/dist ./dist
COPY --from=builder /app/apps/bff/package*.json ./

RUN npm ci --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]

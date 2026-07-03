# ============================================
# Dockerfile - stream-manager-service
#
# Zweck: Build und Run des Stream-Manager Service
# Verwendet von: infra/stream-stack/docker-compose.yml
# ============================================

FROM node:20-alpine AS deps
WORKDIR /service
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /service
COPY --from=deps /service/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /service
ENV NODE_ENV=production
ENV PORT=3002

RUN apk add --no-cache docker-cli

COPY --from=builder /service/package.json ./package.json
COPY --from=builder /service/package-lock.json ./package-lock.json
COPY --from=builder /service/node_modules ./node_modules
COPY --from=builder /service/dist ./dist

EXPOSE 3002
CMD ["npm", "run", "start"]

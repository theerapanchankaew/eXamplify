# eXamplify production image (Next.js standalone).
# Normally built through docker compose — see docs/DEPLOYMENT.md.
#
#   docker build -t examplify .                 # app image (target: runner)
#   docker build --target tools -t examplify-tools .   # admin/migration scripts

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No build-time secrets or environment needed: all configuration is read at runtime.
RUN npm run build

# One-off admin tasks (create-admin, migrate:firebase) with full source + dev tools.
FROM builder AS tools
ENTRYPOINT ["npm", "run", "--silent"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]

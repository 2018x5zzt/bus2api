FROM node:20-alpine AS build

WORKDIR /app

ARG NUXT_GATEWAY_MODE=core
ARG NUXT_PUBLIC_GATEWAY_MODE=core
ARG NUXT_SUB2API_BASE_URL=http://localhost:8080

ENV NUXT_GATEWAY_MODE=${NUXT_GATEWAY_MODE}
ENV NUXT_PUBLIC_GATEWAY_MODE=${NUXT_PUBLIC_GATEWAY_MODE}
ENV NUXT_SUB2API_BASE_URL=${NUXT_SUB2API_BASE_URL}

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

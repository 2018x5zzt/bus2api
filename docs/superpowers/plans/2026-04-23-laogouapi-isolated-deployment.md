# LaogouAPI Isolated Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a fully isolated `laogouapi` backend and `bus2api` frontend stack, pinned to `upstream/main@0b85a8da888b5390e022f35c4594ee2eb7779210`, validate it on loopback-only staging ports, import the minimum account/proxy configuration needed for live traffic, and cut both the public console and API entrypoints over together with a documented rollback path.

**Architecture:** Keep all persistent state under `/root/laogouapi-deploy`, build the backend from a detached upstream worktree so it cannot drift back to `xlabapi`, and run the staged stack on `127.0.0.1:18080` and `127.0.0.1:18082`. Make `bus2api` consume explicit `NUXT_*` runtime envs for `core` mode, use admin export/import APIs to move only proxy/account operational config, then perform a paired cutover by stopping the old public `sub2api` and `bus2api` containers and bringing up a prewritten public-port overlay for `laogouapi`.

**Tech Stack:** Git worktrees, Docker Compose, Sub2API upstream Docker build, Nuxt 4/Nitro, Vitest, curl, Python 3

---

## File Structure

- `/root/bus2api/frontend/utils/runtime-config.ts`
  Explicitly resolves `gatewayMode` and `sub2apiBaseUrl` from `NUXT_*` env vars so the laogou deployment does not rely on implicit Nuxt env mapping.
- `/root/bus2api/frontend/tests/unit/runtime-config.test.ts`
  Unit coverage for the explicit runtime-config resolver.
- `/root/bus2api/frontend/nuxt.config.ts`
  Uses the runtime-config helper instead of hardcoded backend URLs.
- `/root/bus2api/frontend/Dockerfile`
  Accepts `NUXT_SUB2API_BASE_URL` as both a build arg and runtime env default.
- `/root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d`
  Detached upstream source tree pinned to the approved commit.
- `/root/laogouapi-deploy/.env`
  Isolated deployment secrets, staging/public port settings, and operator admin credentials reused from the current stack.
- `/root/laogouapi-deploy/BUILD_INFO`
  Audit file that records the source repo, worktree path, remote, branch, and pinned commit.
- `/root/laogouapi-deploy/docker-compose.yml`
  Main staging stack with `laogouapi`, `laogouapi-postgres`, `laogouapi-redis`, and `bus2api-frontend-laogou`.
- `/root/laogouapi-deploy/docker-compose.public.yml`
  Public port overlay used only during paired cutover and rollback drills.
- `/root/laogouapi-deploy/migration/`
  Temporary export/import payloads plus smoke-test artifacts (`accounts-active-export.json`, `accounts-active-import.json`, `frontend.cookies`, `api-key.json`, `models.json`, `gateway-smoke.json`).

### Task 1: Make `bus2api` Runtime Target Explicit

**Files:**
- Create: `frontend/utils/runtime-config.ts`
- Create: `frontend/tests/unit/runtime-config.test.ts`
- Modify: `frontend/nuxt.config.ts`
- Modify: `frontend/Dockerfile`

- [ ] **Step 1: Write the failing runtime-config test**

Create `frontend/tests/unit/runtime-config.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'

import {
  resolveGatewayModeEnv,
  resolveSub2apiBaseUrlEnv,
} from '~/utils/runtime-config'

describe('resolveGatewayModeEnv', () => {
  it('prefers the public gateway env when present', () => {
    expect(resolveGatewayModeEnv({
      NUXT_PUBLIC_GATEWAY_MODE: 'enterprise',
      NUXT_GATEWAY_MODE: 'core',
    })).toBe('enterprise')
  })

  it('defaults to core for empty or unknown values', () => {
    expect(resolveGatewayModeEnv({})).toBe('core')
    expect(resolveGatewayModeEnv({ NUXT_GATEWAY_MODE: 'weird' })).toBe('core')
  })
})

describe('resolveSub2apiBaseUrlEnv', () => {
  it('uses the explicit deployment target when provided', () => {
    expect(resolveSub2apiBaseUrlEnv({
      NUXT_SUB2API_BASE_URL: 'http://laogouapi:8080',
    })).toBe('http://laogouapi:8080')
  })

  it('falls back to the local development target', () => {
    expect(resolveSub2apiBaseUrlEnv({})).toBe('http://localhost:8080')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && npm run test:unit -- tests/unit/runtime-config.test.ts
```

Expected: FAIL with `Cannot find module '~/utils/runtime-config'`.

- [ ] **Step 3: Add the resolver helper and wire it into Nuxt and Docker**

Create `frontend/utils/runtime-config.ts`:

```ts
export type RuntimeEnv = Record<string, string | undefined>
export type GatewayMode = 'core' | 'enterprise'

export function resolveGatewayModeEnv(env: RuntimeEnv): GatewayMode {
  const mode = env.NUXT_PUBLIC_GATEWAY_MODE || env.NUXT_GATEWAY_MODE
  return mode === 'enterprise' ? 'enterprise' : 'core'
}

export function resolveSub2apiBaseUrlEnv(env: RuntimeEnv): string {
  return env.NUXT_SUB2API_BASE_URL || 'http://localhost:8080'
}
```

Update `frontend/nuxt.config.ts` by adding these lines near the top of the file:

```ts
import {
  resolveGatewayModeEnv,
  resolveSub2apiBaseUrlEnv,
} from './utils/runtime-config'

const gatewayMode = resolveGatewayModeEnv(process.env)
const sub2apiBaseUrl = resolveSub2apiBaseUrlEnv(process.env)
```

Replace the existing `runtimeConfig` block with:

```ts
runtimeConfig: {
  gatewayMode,
  sub2apiBaseUrl,
  public: {
    siteName: '老狗 API',
    apiBaseUrl: '',
    gatewayMode,
  },
},
```

Update `frontend/Dockerfile`:

```dockerfile
ARG NUXT_GATEWAY_MODE=core
ARG NUXT_PUBLIC_GATEWAY_MODE=core
ARG NUXT_SUB2API_BASE_URL=http://localhost:8080

ENV NUXT_GATEWAY_MODE=${NUXT_GATEWAY_MODE}
ENV NUXT_PUBLIC_GATEWAY_MODE=${NUXT_PUBLIC_GATEWAY_MODE}
ENV NUXT_SUB2API_BASE_URL=${NUXT_SUB2API_BASE_URL}
```

- [ ] **Step 4: Run the new unit test and the existing proxy test**

Run:

```bash
source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && npm run test:unit -- tests/unit/runtime-config.test.ts tests/unit/api-v1-proxy.test.ts
```

Expected: PASS for both test files.

- [ ] **Step 5: Run a frontend build with the laogou env target**

Run:

```bash
source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && NUXT_GATEWAY_MODE=core NUXT_PUBLIC_GATEWAY_MODE=core NUXT_SUB2API_BASE_URL=http://laogouapi:8080 npm run build
```

Expected: PASS with a successful `.output` build.

- [ ] **Step 6: Commit the frontend runtime-config change**

Run:

```bash
git -C /root/bus2api add frontend/utils/runtime-config.ts frontend/tests/unit/runtime-config.test.ts frontend/nuxt.config.ts frontend/Dockerfile
git -C /root/bus2api commit -m "feat: make bus2api runtime target explicit"
```

Expected: a new commit exists in `/root/bus2api` and `git -C /root/bus2api status --short` no longer lists those files as modified.

### Task 2: Create the Pinned Upstream Worktree and Isolated Deployment Root

**Files:**
- Create: `/root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d`
- Create: `/root/laogouapi-deploy/.env`
- Create: `/root/laogouapi-deploy/BUILD_INFO`
- Create: `/root/laogouapi-deploy/data`
- Create: `/root/laogouapi-deploy/postgres_data`
- Create: `/root/laogouapi-deploy/redis_data`
- Create: `/root/laogouapi-deploy/migration`

- [ ] **Step 1: Fetch upstream and confirm the approved commit exists**

Run:

```bash
git -C /root/sub2api-src fetch upstream main
git -C /root/sub2api-src rev-parse --verify 0b85a8da888b5390e022f35c4594ee2eb7779210
```

Expected: the second command prints `0b85a8da888b5390e022f35c4594ee2eb7779210`.

- [ ] **Step 2: Create the detached laogou worktree at the pinned commit**

Run:

```bash
mkdir -p /root/.config/superpowers/worktrees/sub2api-src
git -C /root/sub2api-src worktree add --detach /root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d 0b85a8da888b5390e022f35c4594ee2eb7779210
git -C /root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d rev-parse HEAD
```

Expected: the worktree is created and `rev-parse HEAD` prints the same pinned commit.

- [ ] **Step 3: Create the isolated deployment directories and audit file**

Run:

```bash
mkdir -p /root/laogouapi-deploy/data /root/laogouapi-deploy/postgres_data /root/laogouapi-deploy/redis_data /root/laogouapi-deploy/migration
cat >/root/laogouapi-deploy/BUILD_INFO <<'EOF'
LAOGOUAPI_SOURCE_REPO=/root/sub2api-src
LAOGOUAPI_SOURCE_WORKTREE=/root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d
LAOGOUAPI_SOURCE_REMOTE=upstream
LAOGOUAPI_SOURCE_BRANCH=main
LAOGOUAPI_SOURCE_COMMIT=0b85a8da888b5390e022f35c4594ee2eb7779210
EOF
```

Expected: `/root/laogouapi-deploy/BUILD_INFO` exists and contains the exact worktree path and commit.

- [ ] **Step 4: Generate the isolated `.env` using current operator admin credentials and fresh secrets**

Run:

```bash
CURRENT_ADMIN_EMAIL="$(sed -n -E 's/^ADMIN_EMAIL=(.*)$/\1/p' /root/sub2api-deploy/.env | tail -n 1)"
CURRENT_ADMIN_PASSWORD="$(sed -n -E 's/^ADMIN_PASSWORD=(.*)$/\1/p' /root/sub2api-deploy/.env | tail -n 1)"
JWT_SECRET="$(openssl rand -hex 32)"
TOTP_ENCRYPTION_KEY="$(openssl rand -hex 32)"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
REDIS_PASSWORD="$(openssl rand -hex 24)"

cat >/root/laogouapi-deploy/.env <<EOF
COMPOSE_PROJECT_NAME=laogouapi
TZ=Asia/Shanghai
LAOGOUAPI_SOURCE_WORKTREE=/root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d
LAOGOUAPI_SOURCE_COMMIT=0b85a8da888b5390e022f35c4594ee2eb7779210
LAOGOUAPI_STAGING_API_PORT=18080
LAOGOUAPI_STAGING_FRONTEND_PORT=18082
LAOGOUAPI_PUBLIC_API_BIND_HOST=0.0.0.0
LAOGOUAPI_PUBLIC_FRONTEND_BIND_HOST=0.0.0.0
LAOGOUAPI_PUBLIC_API_PORT=8081
LAOGOUAPI_PUBLIC_FRONTEND_PORT=8082
POSTGRES_USER=laogouapi
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=laogouapi
REDIS_PASSWORD=${REDIS_PASSWORD}
ADMIN_EMAIL=${CURRENT_ADMIN_EMAIL}
ADMIN_PASSWORD=${CURRENT_ADMIN_PASSWORD}
JWT_SECRET=${JWT_SECRET}
TOTP_ENCRYPTION_KEY=${TOTP_ENCRYPTION_KEY}
RUN_MODE=standard
SERVER_MODE=release
LOG_LEVEL=info
LOG_FORMAT=json
SECURITY_URL_ALLOWLIST_ENABLED=false
SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=true
EOF
```

Expected: `/root/laogouapi-deploy/.env` exists, contains the pinned worktree path, and has non-empty values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

- [ ] **Step 5: Verify the audit file and `.env` match the approved source pin**

Run:

```bash
grep '^LAOGOUAPI_SOURCE_' /root/laogouapi-deploy/BUILD_INFO
grep '^LAOGOUAPI_SOURCE_' /root/laogouapi-deploy/.env
git -C /root/.config/superpowers/worktrees/sub2api-src/laogouapi-upstream-main-0b85a8d status --short
```

Expected:
- both grep commands show `0b85a8da888b5390e022f35c4594ee2eb7779210`
- the worktree status is clean

### Task 3: Write the Staging and Public Overlay Compose Files

**Files:**
- Create: `/root/laogouapi-deploy/docker-compose.yml`
- Create: `/root/laogouapi-deploy/docker-compose.public.yml`

- [ ] **Step 1: Run compose config first so the missing-file failure is explicit**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml config
```

Expected: FAIL with `no such file or directory` because `docker-compose.yml` does not exist yet.

- [ ] **Step 2: Create the staging compose file**

Create `/root/laogouapi-deploy/docker-compose.yml` with:

```yaml
name: laogouapi

services:
  laogouapi:
    image: laogouapi:0b85a8d
    build:
      context: ${LAOGOUAPI_SOURCE_WORKTREE}
      dockerfile: Dockerfile
      args:
        COMMIT: ${LAOGOUAPI_SOURCE_COMMIT}
    container_name: laogouapi
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:${LAOGOUAPI_STAGING_API_PORT}:8080"
    volumes:
      - ./data:/app/data
    environment:
      - AUTO_SETUP=true
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=8080
      - SERVER_MODE=${SERVER_MODE}
      - RUN_MODE=${RUN_MODE}
      - DATABASE_HOST=laogouapi-postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=${POSTGRES_USER}
      - DATABASE_PASSWORD=${POSTGRES_PASSWORD}
      - DATABASE_DBNAME=${POSTGRES_DB}
      - DATABASE_SSLMODE=disable
      - REDIS_HOST=laogouapi-redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - TOTP_ENCRYPTION_KEY=${TOTP_ENCRYPTION_KEY}
      - TZ=${TZ}
      - LOG_LEVEL=${LOG_LEVEL}
      - LOG_FORMAT=${LOG_FORMAT}
      - SECURITY_URL_ALLOWLIST_ENABLED=${SECURITY_URL_ALLOWLIST_ENABLED}
      - SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS=${SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS}
    depends_on:
      laogouapi-postgres:
        condition: service_healthy
      laogouapi-redis:
        condition: service_healthy
    networks:
      - laogouapi-network
    healthcheck:
      test: ["CMD", "wget", "-q", "-T", "5", "-O", "/dev/null", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  laogouapi-postgres:
    image: postgres:18-alpine
    container_name: laogouapi-postgres
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - PGDATA=/var/lib/postgresql/data
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - TZ=${TZ}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    networks:
      - laogouapi-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  laogouapi-redis:
    image: redis:8-alpine
    container_name: laogouapi-redis
    restart: unless-stopped
    env_file:
      - .env
    command: >
      sh -c '
        redis-server
        --save 60 1
        --appendonly yes
        --appendfsync everysec
        --requirepass "$REDIS_PASSWORD"'
    volumes:
      - ./redis_data:/data
    networks:
      - laogouapi-network
    healthcheck:
      test: ["CMD-SHELL", "REDISCLI_AUTH=${REDIS_PASSWORD} redis-cli ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s

  bus2api-frontend-laogou:
    image: bus2api-frontend:laogouapi
    build:
      context: /root/bus2api/frontend
      dockerfile: Dockerfile
      args:
        NUXT_GATEWAY_MODE: core
        NUXT_PUBLIC_GATEWAY_MODE: core
        NUXT_SUB2API_BASE_URL: http://laogouapi:8080
    container_name: bus2api-frontend-laogou
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOST=0.0.0.0
      - PORT=3000
      - NITRO_HOST=0.0.0.0
      - NITRO_PORT=3000
      - NUXT_GATEWAY_MODE=core
      - NUXT_PUBLIC_GATEWAY_MODE=core
      - NUXT_SUB2API_BASE_URL=http://laogouapi:8080
    ports:
      - "127.0.0.1:${LAOGOUAPI_STAGING_FRONTEND_PORT}:3000"
    depends_on:
      laogouapi:
        condition: service_healthy
    networks:
      - laogouapi-network

networks:
  laogouapi-network:
    name: laogouapi-network
```

- [ ] **Step 3: Create the public-port overlay file**

Create `/root/laogouapi-deploy/docker-compose.public.yml` with:

```yaml
services:
  laogouapi:
    ports:
      - "${LAOGOUAPI_PUBLIC_API_BIND_HOST}:${LAOGOUAPI_PUBLIC_API_PORT}:8080"

  bus2api-frontend-laogou:
    ports:
      - "${LAOGOUAPI_PUBLIC_FRONTEND_BIND_HOST}:${LAOGOUAPI_PUBLIC_FRONTEND_PORT}:3000"
```

- [ ] **Step 4: Validate the staging compose file**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml config >/tmp/laogouapi-staging-config.yaml
sed -n '1,120p' /tmp/laogouapi-staging-config.yaml
```

Expected: PASS and the rendered config contains `container_name: laogouapi`, `container_name: bus2api-frontend-laogou`, and loopback-only ports `127.0.0.1:18080:8080` and `127.0.0.1:18082:3000`.

- [ ] **Step 5: Validate the public overlay file**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml -f /root/laogouapi-deploy/docker-compose.public.yml config >/tmp/laogouapi-public-config.yaml
grep -n '8081:8080\\|8082:3000' /tmp/laogouapi-public-config.yaml
```

Expected: PASS and the rendered config contains both the staging ports and the public overlay ports.

### Task 4: Bring Up the Staged Stack and Import the Minimum Live Account Bundle

**Files:**
- Create: `/root/laogouapi-deploy/migration/accounts-active-export.json`
- Create: `/root/laogouapi-deploy/migration/accounts-active-import.json`
- Create: `/root/laogouapi-deploy/migration/accounts-import-result.json`

- [ ] **Step 1: Build and start the staged stack**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml up -d --build
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml ps
```

Expected: all four services start, and `laogouapi` plus `bus2api-frontend-laogou` show `Up`.

- [ ] **Step 2: Verify basic staged health before any data import**

Run:

```bash
curl -fsS http://127.0.0.1:18080/health
curl -fsS http://127.0.0.1:18080/api/v1/settings/public
curl -fsSI http://127.0.0.1:18082/
curl -fsSI http://127.0.0.1:18082/auth/login
curl -fsS http://127.0.0.1:18082/api/v1/settings/public
```

Expected:
- backend health returns success JSON
- both staged frontend URLs return `200`
- the frontend proxy returns public settings JSON from the new backend

- [ ] **Step 3: Log into the old and new stacks as the operator admin**

Run:

```bash
OLD_API_PORT="$(docker port sub2api 8080/tcp | sed -E 's/.*:([0-9]+)$/\1/')"
ADMIN_EMAIL="$(sed -n -E 's/^ADMIN_EMAIL=(.*)$/\1/p' /root/laogouapi-deploy/.env | tail -n 1)"
ADMIN_PASSWORD="$(sed -n -E 's/^ADMIN_PASSWORD=(.*)$/\1/p' /root/laogouapi-deploy/.env | tail -n 1)"

OLD_ACCESS_TOKEN="$(
  curl -fsS "http://127.0.0.1:${OLD_API_PORT}/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["access_token"])'
)"

NEW_ACCESS_TOKEN="$(
  curl -fsS http://127.0.0.1:18080/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["access_token"])'
)"

printf '%s\n' "${OLD_ACCESS_TOKEN}" | wc -c
printf '%s\n' "${NEW_ACCESS_TOKEN}" | wc -c
```

Expected: both token-length checks print values greater than `20`.

- [ ] **Step 4: Export the active account bundle from the old stack**

Run:

```bash
curl -fsS "http://127.0.0.1:${OLD_API_PORT}/api/v1/admin/accounts/data?status=active" \
  -H "Authorization: Bearer ${OLD_ACCESS_TOKEN}" \
  -o /root/laogouapi-deploy/migration/accounts-active-export.json

python3 - <<'PY'
import json
from pathlib import Path
src = Path('/root/laogouapi-deploy/migration/accounts-active-export.json')
payload = json.loads(src.read_text())
assert payload['code'] == 0, payload
assert isinstance(payload['data']['accounts'], list), payload
assert isinstance(payload['data']['proxies'], list), payload
print(len(payload['data']['accounts']))
PY
```

Expected: the Python check prints an integer greater than `0`.

- [ ] **Step 5: Convert the export payload into the import request and import it into `laogouapi`**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path
src = Path('/root/laogouapi-deploy/migration/accounts-active-export.json')
dst = Path('/root/laogouapi-deploy/migration/accounts-active-import.json')
payload = json.loads(src.read_text())
dst.write_text(json.dumps({
    "data": payload["data"],
    "skip_default_group_bind": False,
}, indent=2))
PY

curl -fsS http://127.0.0.1:18080/api/v1/admin/accounts/data \
  -H "Authorization: Bearer ${NEW_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-binary @/root/laogouapi-deploy/migration/accounts-active-import.json \
  -o /root/laogouapi-deploy/migration/accounts-import-result.json

python3 - <<'PY'
import json
from pathlib import Path
result = json.loads(Path('/root/laogouapi-deploy/migration/accounts-import-result.json').read_text())
assert result['code'] == 0, result
assert result['data']['account_created'] > 0, result
print(result['data'])
PY
```

Expected: the final Python check prints a result object with `account_created > 0`.

### Task 5: Run the Staged End-to-End Smoke Tests Through the New Frontend and Gateway

**Files:**
- Create: `/root/laogouapi-deploy/migration/frontend.cookies`
- Create: `/root/laogouapi-deploy/migration/groups.json`
- Create: `/root/laogouapi-deploy/migration/api-key.json`
- Create: `/root/laogouapi-deploy/migration/models.json`
- Create: `/root/laogouapi-deploy/migration/gateway-smoke.json`

- [ ] **Step 1: Log into the staged frontend through the Nuxt auth route**

Run:

```bash
rm -f /root/laogouapi-deploy/migration/frontend.cookies
curl -fsS -c /root/laogouapi-deploy/migration/frontend.cookies \
  http://127.0.0.1:18082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" >/tmp/laogouapi-frontend-login.json

grep -q 'access_token' /root/laogouapi-deploy/migration/frontend.cookies
```

Expected: PASS and the cookie jar contains `access_token`.

- [ ] **Step 2: Resolve the first available group through the staged frontend proxy**

Run:

```bash
curl -fsS -b /root/laogouapi-deploy/migration/frontend.cookies \
  http://127.0.0.1:18082/api/v1/groups/available \
  -o /root/laogouapi-deploy/migration/groups.json

GROUP_ID="$(
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/root/laogouapi-deploy/migration/groups.json').read_text())
groups = payload['data']
assert groups, payload
print(groups[0]['id'])
PY
)"

printf '%s\n' "${GROUP_ID}"
```

Expected: the final command prints a positive integer.

- [ ] **Step 3: Create a staged API key through the frontend proxy**

Run:

```bash
curl -fsS -b /root/laogouapi-deploy/migration/frontend.cookies \
  http://127.0.0.1:18082/api/v1/keys \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"laogou-smoke-key\",\"group_id\":${GROUP_ID}}" \
  -o /root/laogouapi-deploy/migration/api-key.json

LAOGOU_API_KEY="$(
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/root/laogouapi-deploy/migration/api-key.json').read_text())
assert payload['code'] == 0, payload
print(payload['data']['key'])
PY
)"

printf '%s\n' "${LAOGOU_API_KEY}" | wc -c
```

Expected: the final length check prints a value greater than `20`.

- [ ] **Step 4: Query the staged gateway model list with the new API key**

Run:

```bash
curl -fsS http://127.0.0.1:18080/v1/models \
  -H "Authorization: Bearer ${LAOGOU_API_KEY}" \
  -o /root/laogouapi-deploy/migration/models.json

FIRST_MODEL="$(
  python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/root/laogouapi-deploy/migration/models.json').read_text())
models = payload.get('data', [])
assert models, payload
print(models[0]['id'])
PY
)"

printf '%s\n' "${FIRST_MODEL}"
```

Expected: the final command prints a non-empty model id.

- [ ] **Step 5: Run one real staged gateway request using the discovered model**

Run:

```bash
case "${FIRST_MODEL}" in
  gemini*)
    curl -fsS "http://127.0.0.1:18080/v1beta/models/${FIRST_MODEL}:generateContent" \
      -H "Authorization: Bearer ${LAOGOU_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d '{"contents":[{"role":"user","parts":[{"text":"reply with pong"}]}]}' \
      -o /root/laogouapi-deploy/migration/gateway-smoke.json
    ;;
  sora*)
    curl -fsS http://127.0.0.1:18080/sora/v1/chat/completions \
      -H "Authorization: Bearer ${LAOGOU_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d "{\"model\":\"${FIRST_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with pong\"}],\"max_tokens\":16}" \
      -o /root/laogouapi-deploy/migration/gateway-smoke.json
    ;;
  *)
    curl -fsS http://127.0.0.1:18080/v1/chat/completions \
      -H "Authorization: Bearer ${LAOGOU_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d "{\"model\":\"${FIRST_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"reply with pong\"}],\"max_tokens\":16}" \
      -o /root/laogouapi-deploy/migration/gateway-smoke.json
    ;;
esac

python3 - <<'PY'
import json
from pathlib import Path
payload = json.loads(Path('/root/laogouapi-deploy/migration/gateway-smoke.json').read_text())
assert payload, payload
print(json.dumps(payload)[:200])
PY
```

Expected: PASS and the Python check prints the first 200 characters of a non-empty gateway response payload.

### Task 6: Perform the Paired Cutover and Prove Rollback Works

**Files:**
- Modify: `/root/laogouapi-deploy/.env`
- Reuse: `/root/laogouapi-deploy/docker-compose.yml`
- Reuse: `/root/laogouapi-deploy/docker-compose.public.yml`

- [ ] **Step 1: Resolve the currently serving public API and frontend ports and persist them into `.env`**

Run:

```bash
CURRENT_PUBLIC_API_PORT="$(docker port sub2api 8080/tcp | sed -E 's/.*:([0-9]+)$/\1/')"
CURRENT_PUBLIC_FRONTEND_PORT="$(docker port bus2api-frontend-enterprise-console-v3 3000/tcp | sed -E 's/.*:([0-9]+)$/\1/')"
export CURRENT_PUBLIC_API_PORT CURRENT_PUBLIC_FRONTEND_PORT

python3 - <<'PY'
from pathlib import Path
env_path = Path('/root/laogouapi-deploy/.env')
text = env_path.read_text()
replacements = {
    'LAOGOUAPI_PUBLIC_API_PORT=': f"LAOGOUAPI_PUBLIC_API_PORT={__import__('os').environ['CURRENT_PUBLIC_API_PORT']}",
    'LAOGOUAPI_PUBLIC_FRONTEND_PORT=': f"LAOGOUAPI_PUBLIC_FRONTEND_PORT={__import__('os').environ['CURRENT_PUBLIC_FRONTEND_PORT']}",
}
lines = []
for line in text.splitlines():
    replaced = False
    for prefix, value in replacements.items():
        if line.startswith(prefix):
            lines.append(value)
            replaced = True
            break
    if not replaced:
        lines.append(line)
env_path.write_text('\n'.join(lines) + '\n')
PY

grep '^LAOGOUAPI_PUBLIC_' /root/laogouapi-deploy/.env
```

Expected: `.env` now shows the real currently serving public API and frontend ports.

- [ ] **Step 2: Validate the public overlay against the discovered live ports**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml -f /root/laogouapi-deploy/docker-compose.public.yml config >/tmp/laogouapi-live-overlay.yaml
grep -n "${CURRENT_PUBLIC_API_PORT}:8080\\|${CURRENT_PUBLIC_FRONTEND_PORT}:3000" /tmp/laogouapi-live-overlay.yaml
```

Expected: PASS and the overlay renders the exact live API and frontend ports.

- [ ] **Step 3: Freeze old-stack writes by stopping the currently serving public containers**

Run:

```bash
docker stop bus2api-frontend-enterprise-console-v3 sub2api
docker ps --filter name=^/bus2api-frontend-enterprise-console-v3$ --filter name=^/sub2api$ --format 'table {{.Names}}\t{{.Status}}'
```

Expected: the filtered `docker ps` output is empty, confirming neither old public container is still serving writes.

- [ ] **Step 4: Bring up the laogou public overlay**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml -f /root/laogouapi-deploy/docker-compose.public.yml up -d
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml -f /root/laogouapi-deploy/docker-compose.public.yml ps
```

Expected: `laogouapi` and `bus2api-frontend-laogou` are up and bound to both the staging and public ports.

- [ ] **Step 5: Re-run the live public validations on the cutover ports**

Run:

```bash
curl -fsS "http://127.0.0.1:${CURRENT_PUBLIC_API_PORT}/health"
curl -fsSI "http://127.0.0.1:${CURRENT_PUBLIC_FRONTEND_PORT}/"
curl -fsS "http://127.0.0.1:${CURRENT_PUBLIC_FRONTEND_PORT}/api/v1/settings/public"
curl -fsS "http://127.0.0.1:${CURRENT_PUBLIC_API_PORT}/v1/models" -H "Authorization: Bearer ${LAOGOU_API_KEY}" >/tmp/laogouapi-public-models.json
```

Expected:
- health returns success JSON from `laogouapi`
- frontend root returns `200`
- the frontend proxy returns public settings JSON
- the public API gateway responds successfully to the existing staged smoke-test API key

- [ ] **Step 6: Prove rollback restores the old public paths and keeps the staged laogou stack intact**

Run:

```bash
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml -f /root/laogouapi-deploy/docker-compose.public.yml down
docker start sub2api bus2api-frontend-enterprise-console-v3
curl -fsS "http://127.0.0.1:${CURRENT_PUBLIC_API_PORT}/health"
curl -fsSI "http://127.0.0.1:${CURRENT_PUBLIC_FRONTEND_PORT}/"
docker compose --env-file /root/laogouapi-deploy/.env -f /root/laogouapi-deploy/docker-compose.yml up -d
curl -fsS http://127.0.0.1:18080/health
curl -fsSI http://127.0.0.1:18082/
```

Expected:
- the old public API and frontend ports respond again after `docker start`
- the laogou stack comes back on `18080` and `18082` without the public overlay

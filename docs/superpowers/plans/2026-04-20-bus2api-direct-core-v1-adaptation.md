# Bus2API Direct Core V1 Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the `bus2api` Nuxt frontend directly to the `sub2api` core backend so login, keys, usage, billing, and security flows work via `/api/v1/*` in production.

**Architecture:** Keep existing page-level `/api/v1/*` calls intact. Add a production Nitro catch-all proxy for browser requests, inject `Authorization: Bearer <access_token>` during SSR requests, and move the deployed frontend container onto the core backend network with `NUXT_SUB2API_BASE_URL` pointing at `sub2api`.

**Tech Stack:** Nuxt 4, Nitro server routes, Vitest, Docker Compose

---

### Task 1: Cover SSR auth forwarding

**Files:**
- Modify: `frontend/tests/unit/useApi.test.ts`
- Modify: `frontend/composables/useApi.ts`

- [ ] **Step 1: Write the failing test**

Add a test that simulates server-side execution with `useRequestHeaders()` returning `cookie: access_token=...` and assert that `$fetch` receives `Authorization: Bearer ...`.

- [ ] **Step 2: Run test to verify it fails**

Run: `source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && npm run test:unit -- tests/unit/useApi.test.ts`
Expected: FAIL because server-side requests currently forward only `cookie`.

- [ ] **Step 3: Write minimal implementation**

Update `useApi.ts` to read the `access_token` value from incoming cookies during SSR and set `Authorization` unless the caller already provided one.

- [ ] **Step 4: Run test to verify it passes**

Run the same Vitest command and confirm the new SSR case passes.

### Task 2: Add production `/api/v1` proxy

**Files:**
- Create: `frontend/server/api/v1/[...path].ts`
- Test: request-level verification after build/deploy

- [ ] **Step 1: Add production proxy route**

Create a Nitro route that proxies any method under `/api/v1/**` to `${runtimeConfig.sub2apiBaseUrl}/api/v1/**`, forwarding request body, query string, cookies, and `Authorization`.

- [ ] **Step 2: Verify build accepts the route**

Run: `source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && npm run build`
Expected: build succeeds with the new catch-all route.

### Task 3: Cut deployment over to core

**Files:**
- Modify: `/root/sub2api-deploy/docker-compose.enterprise-console-v3.yml`

- [ ] **Step 1: Point frontend runtime config at core**

Set `NUXT_SUB2API_BASE_URL=http://sub2api:8080`.

- [ ] **Step 2: Join frontend to shared backend network**

Attach `bus2api-frontend-v3` to `sub2api-shared` in addition to the existing frontend network.

- [ ] **Step 3: Remove frontend dependency on enterprise-bff**

Drop the `depends_on` requirement from the frontend service so it can start independently of `enterprise-bff-v3`.

### Task 4: Verify and deploy

**Files:**
- No code changes required beyond prior tasks

- [ ] **Step 1: Run focused unit tests**

Run: `source /root/.nvm/nvm.sh && nvm use 20 >/dev/null && cd /root/bus2api/frontend && npm run test:unit -- tests/unit/useApi.test.ts`
Expected: PASS

- [ ] **Step 2: Rebuild frontend image**

Run: `docker compose --env-file /root/sub2api-deploy/.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml build bus2api-frontend-v3`
Expected: build succeeds

- [ ] **Step 3: Redeploy frontend**

Run: `set -a && . /root/sub2api-deploy/.env && docker compose --env-file /root/sub2api-deploy/.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml up -d --build bus2api-frontend-v3`
Expected: container restarts healthy on port `8082`

- [ ] **Step 4: Verify direct-core endpoints**

Run:
- `curl -i http://127.0.0.1:8082/`
- `curl -sS http://127.0.0.1:8082/api/v1/settings/public`

Expected:
- frontend HTML returns `200`
- proxied core public settings return success JSON

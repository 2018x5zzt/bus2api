# Bus2API Enterprise Console Safe Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a loopback-only `v3` bus2api frontend and `enterprise-bff` pair for verification without touching the current `sub2api` frontend or existing production-serving containers.

**Architecture:** Build a new frontend image from `/root/bus2api/frontend` and a new BFF image from `/root/sub2api-src/backend`, then run the frontend only on a private `enterprise-console-v3-network` while the BFF joins both that private network and the shared `sub2api-deploy_sub2api-network`. Keep the current public-serving containers intact and validate the new stack entirely through loopback endpoints first.

**Tech Stack:** Docker, Docker Compose, nginx, Node 20 frontend build, Go 1.26.1 backend build

---

### Task 1: Add The Isolated V3 Compose Definition

**Files:**
- Create: `/root/sub2api-deploy/docker-compose.enterprise-console-v3.yml`
- Test: `docker compose --env-file /tmp/sub2api-enterprise-console-v3.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml config`

- [x] **Step 1: Create the dedicated v3 compose file**

Use a new compose file with:

- service `enterprise-bff-v3`
- service `bus2api-frontend-v3`
- container names `enterprise-bff-enterprise-console-v3` and `bus2api-frontend-enterprise-console-v3`
- loopback port bindings `127.0.0.1:8093:8090` and `127.0.0.1:8086:80`
- network `enterprise-console-v3-network` shared by the new frontend and BFF
- external network `sub2api-deploy_sub2api-network` joined only by the BFF
- private-network alias `enterprise-bff` on the new BFF
- build context `/root/sub2api-src/backend` using `Dockerfile.enterprise-bff`
- build context `/root/bus2api/frontend`
- `VITE_API_BASE_URL=/api`
- frontend dependency on the BFF
- BFF environment pointing to `http://sub2api:8080/api/v1`

- [x] **Step 2: Verify the compose file renders cleanly**

Run:

```bash
docker compose --env-file /tmp/sub2api-enterprise-console-v3.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml config
```

Expected:

- exit code `0`
- both `enterprise-bff-v3` and `bus2api-frontend-v3` appear
- external network `sub2api-deploy_sub2api-network` resolves correctly
- private network `enterprise-console-v3-network` renders correctly

### Task 2: Build And Start The Parallel V3 Stack

**Files:**
- Modify: `/root/sub2api-deploy/docker-compose.enterprise-console-v3.yml`
- Test: `docker compose --env-file /tmp/sub2api-enterprise-console-v3.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml up -d --build`

- [x] **Step 1: Build and start the v3 stack**

Run:

```bash
docker compose --env-file /tmp/sub2api-enterprise-console-v3.env -f /root/sub2api-deploy/docker-compose.enterprise-console-v3.yml up -d --build
```

Expected:

- new images build successfully
- `enterprise-bff-enterprise-console-v3` starts
- `bus2api-frontend-enterprise-console-v3` starts
- no existing container is restarted or replaced

- [x] **Step 2: Confirm only the new containers changed**

Run:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Status}}'
```

Expected:

- existing `sub2api`, current `bus2api-frontend`, and current `enterprise-bff` remain up
- new `v3` containers appear on `127.0.0.1:8086` and `127.0.0.1:8093`

### Task 3: Verify The New V3 Stack End-To-End

**Files:**
- Modify: `/root/sub2api-deploy/docker-compose.enterprise-console-v3.yml`
- Test: local HTTP checks against `127.0.0.1:8086` and `127.0.0.1:8093`

- [x] **Step 1: Verify the BFF health endpoint**

Run:

```bash
curl -fsS http://127.0.0.1:8093/healthz
```

Expected:

- exit code `0`
- successful health response body

- [x] **Step 2: Verify the frontend serves successfully**

Run:

```bash
curl -fsS -I http://127.0.0.1:8086/
```

Expected:

- exit code `0`
- `HTTP/1.1 200 OK`

- [x] **Step 3: Verify API routing reaches the v3 BFF**

Run:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8086/api/healthz
```

Expected:

- response code confirms the frontend is proxying to the local v3 BFF path
- proxying a real `/api/settings/public` request returns `200` and matches the direct BFF response

- [x] **Step 4: Review logs for startup and routing correctness**

Run:

```bash
docker logs --tail 100 enterprise-bff-enterprise-console-v3
docker logs --tail 100 bus2api-frontend-enterprise-console-v3
```

Expected:

- BFF logs show startup without config/database failures
- frontend logs contain no crash-loop behavior

### Task 4: Record Ready-For-Cutover State

**Files:**
- Modify: `/root/bus2api/docs/superpowers/specs/2026-04-10-bus2api-enterprise-console-safe-deploy-design.md`
- Test: `docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Status}}'`

- [x] **Step 1: Capture the validated runtime endpoints**

Record:

- frontend validation URL
- BFF validation URL
- exact container names
- current public containers left untouched

- [x] **Step 2: State the non-destructive rollback**

Record rollback commands:

```bash
docker rm -f bus2api-frontend-enterprise-console-v3
docker rm -f enterprise-bff-enterprise-console-v3
```

Expected:

- removing `v3` leaves the existing public stack unchanged

# Bus2API Enterprise Console Safe Deploy Design

## Goal

Deploy the newly pushed `bus2api` frontend and `enterprise-bff` backend as an isolated parallel stack that does not replace or interrupt the existing `sub2api` frontend, current `sub2api` core service, or the currently serving `bus2api` path until explicit cutover.

## Constraints

- The existing `sub2api` service on port `8081` must remain untouched.
- The existing `sub2api` browser-facing frontend must keep using the original core surface.
- The new enterprise frontend must continue to use `enterprise-bff`, not the core directly.
- Existing public `bus2api` traffic must not be moved until the new stack is verified locally.
- Rollback must be immediate by leaving the old `bus2api` and old `enterprise-bff` containers in place.

## Current Runtime Facts

- `sub2api` runs in Docker network `sub2api-deploy_sub2api-network` with DNS name `sub2api`.
- Current public `bus2api-frontend` runs on host port `8082`.
- Current `enterprise-bff` runs on loopback port `8090`.
- Existing parallel validation stacks already exist on loopback-only ports, which confirms the host and network support side-by-side rollout.

## Recommended Approach

Use a new `v3` pair of containers:

- `enterprise-bff-enterprise-console-v3`
- `bus2api-frontend-enterprise-console-v3`

Use two Docker networks:

- private network `enterprise-console-v3-network` shared only by the `v3` frontend and the `v3` BFF
- existing shared network `sub2api-deploy_sub2api-network` joined only by the `v3` BFF so it can reach `sub2api`, `postgres`, and `redis`

The new containers bind only to loopback host ports during validation:

- `127.0.0.1:8093 -> enterprise-bff:8090`
- `127.0.0.1:8086 -> bus2api-frontend:80`

The `v3` frontend proxies `/api/` to `http://enterprise-bff:8090/` on the private network, where the `v3` BFF advertises the `enterprise-bff` alias. The `v3` BFF forwards to the existing `sub2api` core service by `http://sub2api:8080/api/v1` on the shared network.

## Why This Is Safe

- No existing container name is reused.
- No existing host port is reused.
- No existing compose file for the running `sub2api` service is modified in place.
- No current public route is switched during deployment.
- Validation happens against loopback-only ports first.
- The new frontend cannot resolve or send traffic to the old `enterprise-bff` because it is isolated on its own private network.

## Deployment Artifacts

Create a dedicated compose file in `/root/sub2api-deploy` for the `v3` stack rather than editing the current release override.

Created file:

- `/root/sub2api-deploy/docker-compose.enterprise-console-v3.yml`

It will define:

- frontend image build from `/root/bus2api/frontend`
- backend image build from `/root/sub2api-src/backend`
- unique container names
- unique image tags
- loopback-only host port bindings
- private network `enterprise-console-v3-network`
- shared external Docker network `sub2api-deploy_sub2api-network` joined only by the BFF
- private-network alias `enterprise-bff` on the `v3` BFF
- environment copied from the proven current `enterprise-bff` runtime shape

## Validation Plan

Validation is complete only if all of the following pass:

1. `enterprise-bff-enterprise-console-v3` container becomes healthy or responds on `/healthz`.
2. `bus2api-frontend-enterprise-console-v3` serves the login page on `127.0.0.1:8086`.
3. Frontend `/api/` requests route to the `v3` BFF rather than the old BFF.
4. The `v3` BFF can reach the existing `sub2api` core through the shared Docker network.
5. Existing `sub2api` and current public `bus2api` containers remain up throughout deployment.

## Validated Runtime State

Validation recorded on `2026-04-10T15:42:52+02:00`.

- frontend container: `bus2api-frontend-enterprise-console-v3`
- BFF container: `enterprise-bff-enterprise-console-v3`
- frontend validation URL: `http://127.0.0.1:8086/`
- frontend proxy validation URL: `http://127.0.0.1:8086/api/settings/public`
- BFF validation URL: `http://127.0.0.1:8093/healthz`
- BFF core-routing validation URL: `http://127.0.0.1:8093/settings/public`
- current public containers left untouched:
  - `sub2api` on `0.0.0.0:8081->8080/tcp`
  - `bus2api-frontend` on `0.0.0.0:8082->80/tcp`
  - `enterprise-bff` on `127.0.0.1:8090->8090/tcp`

The deployed network topology is:

- `bus2api-frontend-enterprise-console-v3` joined only to `enterprise-console-v3-network`
- `enterprise-bff-enterprise-console-v3` joined to both `enterprise-console-v3-network` and `sub2api-deploy_sub2api-network`
- `enterprise-bff-enterprise-console-v3` exposes the `enterprise-bff` alias only on `enterprise-console-v3-network`

## Validation Evidence

- `curl -fsS http://127.0.0.1:8093/healthz` returned `{"code":0,"message":"success","data":{"service":"enterprise-bff","status":"ok"}}`
- `curl -fsS -I http://127.0.0.1:8086/` returned `HTTP/1.1 200 OK`
- `curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8086/api/healthz` returned `200`
- `curl -fsS -o /tmp/enterprise-bff-v3-settings-public.json -w '%{http_code}\n' http://127.0.0.1:8093/settings/public` returned `200`
- `curl -fsS -o /tmp/bus2api-v3-settings-public.json -w '%{http_code}\n' http://127.0.0.1:8086/api/settings/public` returned `200`
- the direct and proxied `/settings/public` responses were byte-identical
- `enterprise-bff-enterprise-console-v3` logs include `path=/settings/public status=200`
- `bus2api-frontend-enterprise-console-v3` logs include `GET /api/settings/public HTTP/1.1" 200`

## Cutover Model

This task ends at “parallel stack deployed and verified.” Public traffic cutover is a separate, explicit operation after validation.

## Rollback

Rollback for this deployment task is only:

- stop and remove the `v3` frontend container
- stop and remove the `v3` BFF container
- optionally delete the `v3` images

Rollback commands:

```bash
docker rm -f bus2api-frontend-enterprise-console-v3
docker rm -f enterprise-bff-enterprise-console-v3
```

Removing the `v3` pair leaves the existing public-serving `sub2api`, `bus2api-frontend`, and `enterprise-bff` containers unchanged.

No rollback step will touch:

- `sub2api`
- current public `bus2api-frontend`
- current `enterprise-bff`

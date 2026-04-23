# LaogouAPI Isolated Deployment Design

## Goal

Deploy a fully isolated `laogouapi` backend stack from `upstream/main@0b85a8da888b5390e022f35c4594ee2eb7779210`, keep the existing `/root/sub2api-deploy` stack untouched, and move the `bus2api` frontend onto this new backend so the frontend serves exactly one backend stack.

## Scope

This design covers:

- A new deployment root at `/root/laogouapi-deploy`
- A new isolated backend stack with dedicated PostgreSQL, Redis, and runtime data directories
- Explicit `laogou` naming for deployment artifacts to simplify operations
- A `bus2api` frontend deployment that talks directly to the new core backend
- A staged cutover with validation before moving public traffic
- A fast rollback path that restores the current public frontend path without data entanglement

This design does not cover:

- Migrating users, tokens, API keys, or billing data from the current stack
- Reusing `sub2api2`
- Preserving the current `enterprise-bff` path for the new `laogouapi` stack

## Current State

The current environment contains:

- `/root/sub2api-deploy`, which runs the active `sub2api` backend stack
- `/root/sub2api-src`, which contains the source repository with `origin` and `upstream` remotes
- `/root/bus2api`, which contains the Nuxt frontend and existing deployment-oriented documentation
- An active `bus2api` production container on host port `8082`
- An active `enterprise-bff` container on host port `8093`
- An active `sub2api2` container on host port `11451`

The current `/root/sub2api-deploy` backend is not built from upstream `main`. It is built from the local `xlabapi` line. The new `laogouapi` stack must not reuse its code, PostgreSQL, Redis, or `/app/data`.

## Chosen Approach

The selected approach is:

1. Create a new deployment root at `/root/laogouapi-deploy`
2. Build a new `laogouapi` image strictly from `upstream/main@0b85a8da888b5390e022f35c4594ee2eb7779210`
3. Run a new isolated stack with:
   - `laogouapi`
   - `laogouapi-postgres`
   - `laogouapi-redis`
   - `bus2api-frontend-laogou`
4. Remove `enterprise-bff` from the new traffic path
5. Switch the `bus2api` frontend to core mode and point it directly to `laogouapi`
6. Bring the new stack up on localhost-only validation ports first, then cut public traffic after verification

This provides real operational isolation instead of only adding another application container on shared state.

## Naming Rules

All new operational objects must carry an explicit `laogou` marker.

Required names:

- Deployment root: `/root/laogouapi-deploy`
- Backend container: `laogouapi`
- PostgreSQL container: `laogouapi-postgres`
- Redis container: `laogouapi-redis`
- Frontend container: `bus2api-frontend-laogou`
- Network: `laogouapi-network`

Recommended naming for supporting artifacts:

- Compose project name: `laogouapi`
- Image tag suffix: include `laogouapi` and the pinned commit short SHA
- Backup or rollback snapshots: include `laogouapi` and a timestamp
- Any future health-check, monitoring, or service labels: include `laogouapi`

The purpose of this rule is to make `docker ps`, `docker logs`, `docker network ls`, filesystem inspection, and on-call debugging unambiguous.

## Repository and Source Pinning

The new backend must be built from `/root/sub2api-src`, but not from the currently active local branch. The build source must be pinned to:

- Remote: `upstream`
- Branch: `main`
- Commit: `0b85a8da888b5390e022f35c4594ee2eb7779210`

Operational requirements:

- The implementation must record the pinned commit in the deployment metadata
- The compose or build configuration should make the source pin obvious during future audits
- The implementation must not accidentally fall back to `origin/xlabapi`, `origin/main`, or the current checked-out local branch

## Deployment Layout

The new deployment root at `/root/laogouapi-deploy` should contain:

- `docker-compose.yml`
- `.env`
- `data/`
- `postgres_data/`
- `redis_data/`

The stack must be self-contained. No bind mounts or shared networks should point back into `/root/sub2api-deploy` unless explicitly needed for a future migration task. This design assumes no such sharing.

## Runtime Topology

The target topology is:

`bus2api-frontend-laogou` -> `laogouapi` -> `laogouapi-postgres`

`bus2api-frontend-laogou` -> `laogouapi` -> `laogouapi-redis`

All four services should live on `laogouapi-network`.

Rules:

- `laogouapi-postgres` must not expose a host port
- `laogouapi-redis` must not expose a host port
- `laogouapi` may expose a localhost-only validation port before public cutover
- `bus2api-frontend-laogou` may expose a localhost-only validation port before public cutover
- Internal service-to-service communication must use container DNS names, not host loopback addresses

## Frontend Integration Design

The `bus2api` frontend already contains direct core proxy paths for `/api/v1/**` and `/api/auth/**`. The new deployment must use those direct core paths and remove `enterprise-bff` from the new stack.

Required frontend runtime behavior:

- `gatewayMode` must be `core`
- `NUXT_SUB2API_BASE_URL` must point to `http://laogouapi:8080`
- The new frontend container should be deployed as `bus2api-frontend-laogou`

Behavioral consequences:

- `/api/v1/**` requests continue to proxy to the backend through Nuxt server routes
- `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, and related auth routes proxy directly to the core backend
- The current enterprise portal mode is not used for the new `laogouapi` path
- The login page returns to core-mode behavior instead of the enterprise-only company-name flow
- Public registration visibility is controlled by the new backend's own public settings, not by the old stack

This change satisfies the isolation goal because the new `bus2api` deployment will serve exactly one backend stack.

## Ports and Cutover Staging

Observed active host ports include:

- `8081` for the current `sub2api`
- `8082` for the current public `bus2api` frontend
- `8093` for the current `enterprise-bff`
- `11451` for `sub2api2`

To avoid collisions and allow side-by-side validation, the new `laogouapi` stack should start with localhost-only staging ports:

- `127.0.0.1:18080 -> laogouapi:8080`
- `127.0.0.1:18082 -> bus2api-frontend-laogou:3000`

Rationale:

- No existing public service needs to be stopped for the first validation round
- Validation can be completed locally before the public entrypoint changes
- Public traffic can remain on the old `8082` path until the new stack is confirmed healthy

After validation, public cutover can happen by either:

- Changing the frontend container host port mapping to the public target port
- Repointing the existing fronting proxy or tunnel to the new localhost validation port

The exact public-entry mechanism can be chosen during implementation, but the cutover must preserve a one-command rollback to the old frontend path.

## Data and State Isolation

The new stack must use:

- A fresh PostgreSQL data directory under `/root/laogouapi-deploy/postgres_data`
- A fresh Redis data directory under `/root/laogouapi-deploy/redis_data`
- A fresh runtime data directory under `/root/laogouapi-deploy/data`

It must not reuse:

- The current `sub2api-deploy` PostgreSQL container or storage
- The current `sub2api-deploy` Redis container or storage
- The current `sub2api-deploy` `/app/data`
- Any state from `sub2api2`

This avoids:

- Schema interference between `xlabapi`-derived code and upstream `main`
- Shared Redis keyspace behavior
- Shared token or session side effects
- Shared operational data mutations
- False confidence from partial isolation

## Error Handling and Failure Model

The implementation must assume these failure modes and handle them explicitly:

- Source mismatch: the build accidentally uses the wrong branch or commit
- Port collision: the planned validation port is already occupied
- Frontend boot succeeds but backend proxy routes still point at the wrong target
- Backend boots but cannot initialize because required environment values are missing
- Public registration or login behavior differs from the current enterprise-flavored flow
- Public cutover succeeds but browser-visible requests still reach the old frontend path

Mitigations:

- Record and verify the pinned backend commit before build
- Validate host port availability before binding final ports
- Validate both backend health and frontend proxy behavior before public cutover
- Keep the old public `8082` stack running until the new stack is confirmed healthy
- Treat login, registration, and `settings/public` checks as first-class acceptance tests

## Verification Plan

Before public cutover, the new stack must pass:

- `http://127.0.0.1:18080/health`
- `http://127.0.0.1:18080/api/v1/settings/public`
- `http://127.0.0.1:18082/`
- `http://127.0.0.1:18082/auth/login`
- `http://127.0.0.1:18082/api/v1/settings/public`

Functional validation goals:

- Backend health returns success
- Backend public settings return success
- Frontend root page loads successfully
- Frontend login page renders in core mode
- Frontend proxy path reaches the new backend rather than the current `enterprise-bff` path

If the implementation enables public registration in the new backend, registration behavior should also be checked through the new frontend path before public cutover.

## Cutover Sequence

The cutover should follow this order:

1. Prepare `/root/laogouapi-deploy` with dedicated env and storage paths
2. Build `laogouapi` from the pinned upstream commit
3. Start the isolated backend stack on localhost-only staging ports
4. Start `bus2api-frontend-laogou` in core mode against `http://laogouapi:8080`
5. Verify the new backend and frontend locally
6. Change the public frontend entrypoint to the new stack
7. Re-run public validation against the live hostname
8. Only after successful live validation, decide whether to stop the old `bus2api` and `enterprise-bff` containers

## Rollback Design

Rollback must be operationally cheap.

Rules:

- The old public frontend stack stays available until the new stack is live and verified
- Public cutover must not require destroying the old stack first
- New and old stacks must not share mutable backend state

Rollback steps:

1. Repoint the public entrypoint back to the old frontend path
2. Confirm the old public hostname serves the previous frontend again
3. Stop only the new `laogouapi` stack if necessary
4. Preserve `/root/laogouapi-deploy` for later inspection unless the failure requires cleanup

Because the new stack is fully isolated, rollback does not require database repair, Redis cleanup, or config restoration in the current production stack.

## Testing Expectations

Implementation work based on this design should include:

- Deployment-level verification of the new isolated stack
- Frontend verification that `gatewayMode=core` and `NUXT_SUB2API_BASE_URL=http://laogouapi:8080` are respected in the new deployment
- Verification that no request in the new path depends on `enterprise-bff`
- Verification that current services in `/root/sub2api-deploy` and `sub2api2` remain untouched

## Decision Summary

The approved design is:

- Use a new deployment root at `/root/laogouapi-deploy`
- Build from `upstream/main@0b85a8da888b5390e022f35c4594ee2eb7779210`
- Use brand-new PostgreSQL, Redis, and runtime data
- Mark all new runtime objects with explicit `laogou` naming
- Deploy a new `bus2api` frontend instance that talks directly to `laogouapi`
- Use localhost-only staging ports first, then cut public traffic after validation
- Keep rollback simple by leaving the current stack untouched until the new stack is proven

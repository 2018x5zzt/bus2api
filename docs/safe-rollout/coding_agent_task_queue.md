# bus2api Enterprise Safe Rollout - Coding Agent Task Queue

## Purpose
This document turns the strategy documents into an executable work queue for coding agents.

This queue is optimized for your situation:
- frontend can move fast in a local multi-agent environment
- backend must be changed very cautiously
- existing `sub2api-core` production behavior must remain stable
- enterprise capability must be introduced through an explicit middle layer

## Critical Decision
Do **not** treat this as a frontend-only project.

Safe rollout requires:
1. fast frontend iteration
2. a minimal backend middle layer (`enterprise-bff`) with strict contract rules
3. a separate metadata store for enterprise-only state
4. read-only shadow validation before any billing-sensitive or policy-sensitive write behavior

## Team / Agent Roles
- **Contract Owner Agent**
  - owns BFF contract, schemas, headers, versioning
- **Frontend Agent**
  - owns UI, routing, feature flags, rendering, client contract compliance
- **Backend BFF Agent**
  - owns enterprise-bff, adapters, idempotency, audit, tenant isolation
- **Data / Reconciliation Agent**
  - owns usage mirror, derived ledger, reconciliation
- **QA / Release Agent**
  - owns test pipeline, canary, rollback drill, release gates

## Global Rules
1. No production-core semantic change in P0.
2. No core DB destructive migration in P0.
3. No billing source of truth in the browser.
4. No admin authorization based only on hidden buttons.
5. Every enterprise feature must be behind feature flags.
6. Every write path must produce audit logs and request tracing.
7. Every task must include rollback instructions.
8. Merge only small PRs with a single risk theme.

## Non-Negotiable File Boundaries
### Safe to modify now
- `frontend/src/router/index.ts`
- `frontend/src/api/client.ts`
- `frontend/src/views/auth/LoginView.vue`
- `frontend/src/layouts/ConsoleLayout.vue`
- `frontend/src/views/keys/KeysView.vue`
- `frontend/src/views/usage/UsageView.vue`
- existing admin views if already present in the repo
- new `contracts/` directory
- new `enterprise-bff/` service
- new `enterprise-metadata-db/` migrations / models

### Do not modify in P0 unless an explicit ADR is approved
- sub2api core scheduler behavior
- sub2api account pool routing logic
- upstream provider adapters
- historical raw usage rows
- core pricing semantics

---

# Phase Order
1. **P0** - contract freeze, client hardening, BFF read-only skeleton, validation scaffolding
2. **P1** - safe write proxy, admin console wiring, usage reports, key lifecycle through BFF
3. **P2** - orgs, members, budgets, audit UI, derived billing, soft enforcement
4. **P3** - optional hard policy enforcement after shadow proof and rollback drill

---

# P0 TASKS (Ship Foundation, Not Business Risk)

## INT-P0-001 - Freeze the Enterprise BFF Contract
**Owner:** Contract Owner Agent  
**Depends on:** none  
**Goal:** define the single browser-facing API contract before frontend and backend diverge.

**Inputs**
- `frontend_development_constraints.md`
- `backend_development_constraints.md`
- `integration_middle_layer_and_validation.md`
- current frontend API usage patterns

**Outputs**
- `contracts/enterprise-bff-openapi.yaml`
- `contracts/contract-version-policy.md`
- `contracts/error-envelope.examples.json`

**Required Decisions**
- contract version string format
- request headers
- pagination envelope
- normalized error envelope
- endpoint naming for session, branding, keys, usage

**Do Not Do**
- do not encode enterprise pricing logic into the schema as browser-owned logic
- do not expose raw core endpoints directly

**Acceptance Commands**
```bash
npx @redocly/cli lint contracts/enterprise-bff-openapi.yaml
```

**Manual Verification**
- frontend owner and backend owner both sign off
- every browser API used in P0 has a matching contract entry

**Rollback**
- contract file is versioned only; no runtime rollback needed

---

## QA-P0-000 - Add Test and Validation Scaffolding
**Owner:** QA / Release Agent  
**Depends on:** INT-P0-001  
**Goal:** create the minimum scripts needed to stop unsafe changes early.

**Inputs**
- `frontend/package.json`

**Outputs**
- frontend scripts for `typecheck`, `test:unit`, `test:e2e`, `contract:test`
- BFF scripts for `test`, `contract:test`
- CI workflow template or equivalent local pipeline instructions

**Implementation Notes**
- add missing frontend test tooling (Vitest + Vue Test Utils + jsdom)
- add e2e tooling (Playwright or equivalent)
- add contract validation step against OpenAPI

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:unit
cd frontend && npm run contract:test
```

**Rollback**
- test scaffolding can be removed independently from product features

---

## FE-P0-001 - Harden the API Client
**Owner:** Frontend Agent  
**Depends on:** INT-P0-001  
**Goal:** remove unsafe defaults and make the frontend contract-aware.

**Inputs**
- `frontend/src/api/client.ts`
- BFF contract from `contracts/enterprise-bff-openapi.yaml`

**Outputs**
- updated `frontend/src/api/client.ts`
- new `frontend/src/lib/request-meta.ts`
- new `frontend/src/lib/error-envelope.ts`

**Required Changes**
- remove fallback production API base URL
- fail fast if API base URL is missing
- send `X-Contract-Version` on all requests
- send `X-Request-ID` on all requests
- send `X-Idempotency-Key` on mutating requests
- normalize error envelope parsing
- keep compatibility mode only behind an explicit feature flag if temporarily needed

**Do Not Do**
- do not add billing math to the client
- do not keep hidden tenant constants in source

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:unit -- api-client
```

**Manual Verification**
- app refuses to boot with missing API base URL in enterprise mode
- mutating requests visibly include request tracing headers

**Rollback**
- restore previous client and disable enterprise flags

---

## FE-P0-002 - Safe Redirect and Role-Aware Routing Skeleton
**Owner:** Frontend Agent  
**Depends on:** FE-P0-001  
**Goal:** prevent redirect abuse and prepare admin routes safely.

**Inputs**
- `frontend/src/router/index.ts`
- `frontend/src/views/auth/LoginView.vue`

**Outputs**
- updated `frontend/src/router/index.ts`
- updated `frontend/src/views/auth/LoginView.vue`
- new `frontend/src/lib/safe-redirect.ts`

**Required Changes**
- create redirect whitelist for internal relative routes only
- reject absolute URLs and protocol-relative URLs
- add admin route meta structure
- add role-aware route guard skeleton
- keep enterprise pages disabled behind flags until BFF is ready

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run test:unit -- redirect route-guards
```

**Manual Verification**
- `/login?redirect=https://evil.example` always lands on safe default route
- non-admin users typing `/admin/...` see unauthorized state

**Rollback**
- remove admin route tree, keep redirect sanitizer

---

## FE-P0-003 - Layout, Branding, and Mobile Navigation Refactor
**Owner:** Frontend Agent  
**Depends on:** FE-P0-002  
**Goal:** make the shell enterprise-ready without coupling to backend internals.

**Inputs**
- `frontend/src/layouts/ConsoleLayout.vue`
- branding contract from BFF

**Outputs**
- updated `frontend/src/layouts/ConsoleLayout.vue`
- new `frontend/src/stores/branding.ts`
- new `frontend/src/components/navigation/MobileDrawer.vue`

**Required Changes**
- load site name / logo / subtitle from branding endpoint
- split user menu vs admin menu
- show explicit unauthorized / unavailable states
- replace collapsed-only mobile sidebar with drawer behavior

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:unit -- layout branding
```

**Manual Verification**
- hardcoded product name is gone from the shell in enterprise mode
- mobile navigation is usable without hidden labels

**Rollback**
- disable branding feature flag and fall back to current shell

---

## FE-P0-004 - Scaffold Enterprise Keys and Usage Pages Against Mocked BFF Responses
**Owner:** Frontend Agent  
**Depends on:** FE-P0-003, INT-P0-001  
**Goal:** let frontend agents move fast locally without waiting for live backend completion.

**Inputs**
- `frontend/src/views/keys/KeysView.vue`
- `frontend/src/views/usage/UsageView.vue`
- existing admin views if present
- contract examples from `contracts/`

**Outputs**
- advanced keys form UI
- advanced usage filter UI
- local mock adapters or MSW handlers
- CSV export button wired to contract shape

**Required Changes**
- keys UI fields: `group_id`, `custom_key`, `ip_whitelist`, `ip_blacklist`, rate limits, quota, expiry
- usage filters: `user_id`, `api_key_id`, `group_id`, `model`, `start_date`, `end_date`
- display raw `actual_cost`, derived `billable_cost`, and `rate_multiplier` only when returned by server
- better loading / empty / retry states
- user-visible copy success / failure feedback

**Do Not Do**
- do not compute authoritative `billable_cost` in browser-only code

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run test:unit -- keys usage
```

**Manual Verification**
- advanced controls render correctly with mock BFF data
- turning enterprise feature flags off restores current basic user experience

**Rollback**
- turn off feature flags and keep base user pages only

---

## BE-P0-001 - Bootstrap enterprise-bff in Read-Only Mode
**Owner:** Backend BFF Agent  
**Depends on:** INT-P0-001  
**Goal:** create the middle layer without changing production core semantics.

**Inputs**
- BFF OpenAPI contract
- existing core auth / usage / keys endpoints

**Outputs**
- new `enterprise-bff/` service
- health endpoint
- read-only endpoints for:
  - `GET /v1/session/me`
  - `GET /v1/branding`
  - `GET /v1/admin/keys`
  - `GET /v1/admin/usage`
- normalized response / error envelopes

**Required Changes**
- pass request tracing headers downstream
- enforce tenant / actor resolution at BFF boundary
- normalize pagination and errors
- no write proxy yet

**Do Not Do**
- do not mutate core business logic
- do not expose raw core responses directly to browser

**Acceptance Commands**
```bash
cd enterprise-bff && npm test
cd enterprise-bff && npm run contract:test
curl -f http://localhost:<BFF_PORT>/healthz
```

**Manual Verification**
- same actor querying through BFF sees expected read-only data
- no new traffic hits core directly from browser in canary mode

**Rollback**
- disable BFF routing and revert frontend flags

---

## BE-P0-002 - Create enterprise-metadata-db Bootstrap Schema
**Owner:** Backend BFF Agent  
**Depends on:** BE-P0-001  
**Goal:** store enterprise-only state separately from core.

**Outputs**
- new metadata schema / migrations for:
  - tenants
  - organizations
  - organization_members
  - feature_flags
  - audit_logs
  - idempotency_keys
  - branding_overrides

**Do Not Do**
- do not reuse core DB tables for enterprise-only metadata in P0
- do not add destructive core migrations

**Acceptance Commands**
```bash
cd enterprise-bff && npm run db:migrate
cd enterprise-bff && npm run db:test
```

**Manual Verification**
- enterprise metadata can be created and removed without touching core tables

**Rollback**
- drop or disable metadata schema only; core remains intact

---

## BE-P0-003 - Shadow Usage Mirror and Reconciliation Skeleton
**Owner:** Data / Reconciliation Agent  
**Depends on:** BE-P0-001, BE-P0-002  
**Goal:** prove enterprise reporting safety before any policy enforcement.

**Outputs**
- usage mirror job
- reconciliation job
- mismatch reporting table or log stream

**Required Changes**
- ingest raw usage references from core
- derive read-only enterprise reporting rows
- never mutate historical core usage
- compute mismatch metrics between expected report totals and mirrored data

**Acceptance Commands**
```bash
cd enterprise-bff && npm run reconcile:test
cd enterprise-bff && npm run reconcile:dry-run
```

**Manual Verification**
- report totals match mirrored data within agreed threshold
- no duplicate imports on retry

**Rollback**
- stop mirror job; preserve imported records for analysis

---

## QA-P0-001 - Read-Only Canary and Rollback Drill
**Owner:** QA / Release Agent  
**Depends on:** FE-P0-004, BE-P0-003  
**Goal:** validate the new boundary before write behavior is enabled.

**Outputs**
- canary checklist
- rollback drill evidence
- contract test report
- tenant isolation test report

**Acceptance Commands**
```bash
cd frontend && npm run test:e2e
cd enterprise-bff && npm run contract:test
cd enterprise-bff && npm run test:isolation
cd enterprise-bff && npm run rollback:drill
```

**Definition of Done**
- successful canary
- successful rollback drill
- no cross-tenant leakage
- no contract mismatch

---

# P1 TASKS (Ship Usable Enterprise Admin Without Core Risk)

## FE-P1-001 - Wire Existing Admin Views to BFF
**Owner:** Frontend Agent  
**Depends on:** QA-P0-001  
**Goal:** connect admin console pages to the BFF read model.

**Inputs**
- existing admin view files if present
- BFF read endpoints

**Outputs**
- admin route tree enabled by feature flag
- admin menu enabled for admins only
- unauthorized state for non-admins

**Acceptance Commands**
```bash
cd frontend && npm run typecheck
cd frontend && npm run test:e2e -- admin-access
```

---

## BE-P1-001 - Safe Write Proxy for Key Lifecycle
**Owner:** Backend BFF Agent  
**Depends on:** QA-P0-001  
**Goal:** move key lifecycle writes behind audited, idempotent BFF endpoints.

**Outputs**
- `POST /v1/admin/keys`
- `PATCH /v1/admin/keys/{id}`
- `DELETE /v1/admin/keys/{id}`
- idempotency enforcement
- audit log generation

**Required Changes**
- re-read canonical server state after writes
- reject duplicate write replay with same idempotency key unless safely identical

**Acceptance Commands**
```bash
cd enterprise-bff && npm test
cd enterprise-bff && npm run test:idempotency
cd enterprise-bff && npm run test:audit
```

**Rollback**
- disable write routes and keep read routes active

---

## FE-P1-002 - Advanced Keys Console on Real BFF Endpoints
**Owner:** Frontend Agent  
**Depends on:** BE-P1-001  
**Goal:** upgrade key management from basic CRUD to enterprise-ready control.

**Outputs**
- real create / update / disable / delete flows via BFF
- advanced fields bound to contract
- audit request ID surfaced in UI where appropriate

**Acceptance Commands**
```bash
cd frontend && npm run test:e2e -- key-lifecycle
```

---

## BE-P1-002 - Organization, Membership, and Budget Read Models
**Owner:** Backend BFF Agent  
**Depends on:** BE-P1-001  
**Goal:** make enterprise hierarchy visible before enforcement.

**Outputs**
- `GET /v1/orgs/{id}/members`
- `POST /v1/orgs/{id}/members`
- `GET /v1/orgs/{id}/budgets`
- tenant-scoped role model

**Acceptance Commands**
```bash
cd enterprise-bff && npm run test:orgs
cd enterprise-bff && npm run test:isolation
```

---

## FE-P1-003 - Usage Reports, Filters, and Export via BFF
**Owner:** Frontend Agent  
**Depends on:** BE-P1-002  
**Goal:** deliver the core enterprise promise: unified purchase, member allocation visibility, per-user usage detail.

**Outputs**
- per-user breakdown
- per-group breakdown
- filters by user / key / group / model / date range
- export UI
- server-returned `actual_cost`, `billable_cost`, `rate_multiplier`

**Acceptance Commands**
```bash
cd frontend && npm run test:e2e -- usage-report export-report
```

---

## BE-P1-003 - Billing Ledger v1 (Read-Only, Derived)
**Owner:** Data / Reconciliation Agent  
**Depends on:** BE-P1-002  
**Goal:** create enterprise-visible billing data without making it enforcement-critical yet.

**Outputs**
- derived billing ledger table
- `pricing_rule_version`
- `multiplier_source`
- compensation-entry model for adjustments

**Acceptance Commands**
```bash
cd enterprise-bff && npm run test:ledger
cd enterprise-bff && npm run reconcile:test
```

**Rollback**
- disable ledger-backed pages, keep raw usage reporting available

---

# P2 TASKS (Monetization and Governance)

## FE-P2-001 - Organization Management UI
**Owner:** Frontend Agent  
**Depends on:** BE-P1-002  
**Goal:** let enterprise admins manage members, roles, and budgets safely.

**Outputs**
- members page
- role change flow
- budget dashboard
- warning states (not hard blocks yet)

---

## FE-P2-002 - Audit, Billing, and Reporting UI
**Owner:** Frontend Agent  
**Depends on:** BE-P1-003  
**Goal:** expose enterprise trust and finance features.

**Outputs**
- audit log page
- billing ledger page
- export history page

---

## BE-P2-001 - Soft Budget Enforcement
**Owner:** Backend BFF Agent  
**Depends on:** BE-P1-003  
**Goal:** warn first, do not hard-block yet.

**Outputs**
- projected overspend warnings
- policy dry-run evaluation
- optional approval hooks

**Acceptance Commands**
```bash
cd enterprise-bff && npm run test:budget-dry-run
```

---

## QA-P2-001 - Enterprise Canary, Reconciliation, and Rollback Approval
**Owner:** QA / Release Agent  
**Depends on:** FE-P2-002, BE-P2-001  
**Goal:** prove the system is safe enough for wider rollout.

**Definition of Done**
- full canary run complete
- rollback drill complete
- reconciliation mismatch below threshold
- explicit approval from frontend and backend owners

---

# Task Dependency Summary
- Start now: `INT-P0-001`
- Then: `QA-P0-000`, `FE-P0-001`, `BE-P0-001`
- Do not enable enterprise writes before: `QA-P0-001`
- Do not enable budget enforcement before: `BE-P1-003` and canary proof

# Immediate Next 3 Tasks
1. `INT-P0-001` - freeze contract and OpenAPI
2. `FE-P0-001` - harden client and remove unsafe defaults
3. `BE-P0-001` - create read-only BFF skeleton

These three tasks unlock almost everything else while keeping production risk low.

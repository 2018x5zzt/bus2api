# Integration Middle Layer and Validation Standard
## Project
bus2api Enterprise Integration Contract - Anti-Corruption Layer, Validation, and Rollout Rules

## 1. Purpose
This document defines the required middle layer between the enterprise frontend and the existing sub2api backend, plus the validation standard that keeps the rollout safe.

This layer is mandatory. It is the main risk-control boundary.

## 2. Name and Role
Recommended service name:
- `enterprise-bff`
- or `enterprise-gateway`

Recommended architecture role:
- anti-corruption layer
- BFF (backend for frontend)
- policy adapter
- contract stabilizer

## 3. Why the Middle Layer Is Mandatory
Without a middle layer:
- the frontend is tightly coupled to core semantics
- enterprise pricing logic leaks into the browser
- production backend changes become risky
- tenant isolation becomes harder to guarantee
- rollout and rollback become harder

With the middle layer:
- the frontend can iterate fast
- the core remains stable
- enterprise-only metadata can live separately
- additive rollout becomes possible

## 4. Contract Boundaries
### 4.1 Frontend -> enterprise-bff
This is the only browser-facing contract after cutover.

### 4.2 enterprise-bff -> sub2api-core
This is an internal compatibility contract.
It may adapt and normalize core responses, but it must not silently reinterpret billing semantics.

### 4.3 enterprise-bff -> enterprise-metadata-db
This is where tenant, member, budget, billing, and audit metadata live.

## 5. Request Rules
### 5.1 Required Headers from Frontend
- `Authorization`
- `X-Contract-Version`
- `X-Request-ID`
- `X-Idempotency-Key` for writes

### 5.2 Required Internal Headers to Core
- `X-Request-ID`
- `X-Enterprise-Actor`
- `X-Enterprise-Tenant`
- `X-Forwarded-By: enterprise-bff`

### 5.3 Versioning
- Contract versions are explicit, not implicit.
- Any breaking change requires a new version.
- The BFF may support multiple frontend versions temporarily during migration.

## 6. Endpoint Design Rules
### 6.1 Never expose raw core APIs directly to the browser after cutover
The BFF must expose explicit enterprise-facing endpoints, such as:
- `GET /v1/session/me`
- `GET /v1/branding`
- `GET /v1/admin/usage`
- `GET /v1/admin/reports/user-breakdown`
- `POST /v1/admin/keys`
- `PATCH /v1/admin/keys/{id}`
- `GET /v1/orgs/{id}/members`
- `POST /v1/orgs/{id}/members`
- `GET /v1/orgs/{id}/budgets`
- `GET /v1/orgs/{id}/audit-logs`

### 6.2 Stable Response Envelope
All endpoints must return a normalized envelope:
```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "meta": {
    "request_id": "uuid",
    "contract_version": "v1"
  }
}
```

### 6.3 Stable Error Envelope
All non-2xx responses must still include:
```json
{
  "code": 1234,
  "message": "human readable",
  "error": {
    "type": "validation_error | auth_error | permission_error | upstream_error",
    "retryable": false
  },
  "meta": {
    "request_id": "uuid",
    "contract_version": "v1"
  }
}
```

## 7. Data Flow Rules
### 7.1 Read Path
1. frontend requests enterprise-bff
2. BFF resolves actor and tenant
3. BFF fetches from core and/or enterprise DB
4. BFF normalizes response
5. frontend renders normalized contract only

### 7.2 Write Path
1. frontend sends request with idempotency key
2. BFF validates input and permission
3. BFF writes audit log pre-entry
4. BFF performs safe downstream action
5. BFF writes audit log completion entry
6. BFF re-reads canonical state if needed
7. BFF returns normalized result

### 7.3 Billing Path
1. core produces raw usage
2. usage mirror imports raw usage references
3. enterprise ledger computes billable entries
4. reconciliation job verifies totals
5. reports read from enterprise ledger, not browser calculation

## 8. Rollout Strategy
### Stage 0 - Preparation
- define schemas
- define tracing fields
- add feature flags
- add canary tenant list

### Stage 1 - Read-Only BFF
- route selected read pages through BFF
- no write behavior change
- compare BFF output with existing frontend output

### Stage 2 - Safe Write Proxy
- key management writes through BFF
- audit logs required
- idempotency required
- rollback tested

### Stage 3 - Enterprise Metadata Features
- orgs
- members
- budgets
- pricing rules
- audit logs
- derived billing

### Stage 4 - Optional Policy Enforcement
- only after shadow mode proves correctness
- warnings first, then soft controls, then hard controls

## 9. Validation Standard
### 9.1 Contract Tests
Required:
- schema validation for every endpoint
- golden sample responses
- backward compatibility snapshot tests
- client code generation smoke test

### 9.2 Functional Tests
Required:
- admin and non-admin route behavior
- key lifecycle behavior
- usage filtering and export
- branding load
- organization membership workflows
- audit log creation

### 9.3 Security Tests
Required:
- role escalation attempts
- cross-tenant access attempts
- invalid redirect attempts
- duplicate request replay with same idempotency key
- malformed contract-version handling

### 9.4 Data Correctness Tests
Required:
- billable ledger equals intended pricing rule application
- actual_cost references match imported raw usage
- report totals match ledger totals
- tenant-scoped exports never include other tenants

### 9.5 Performance Tests
Required:
- BFF p95 latency target
- concurrent admin report access
- async export job throughput
- graceful degradation when core is slow

### 9.6 Operational Tests
Required:
- feature-flag off switch
- canary-only enablement
- forced rollback drill
- traceability from browser request to core request

## 10. Release Gates
Production enablement requires:
- 100% contract test pass
- 100% tenant-isolation test pass
- 100% idempotency test pass
- successful canary run
- successful rollback drill
- reconciliation mismatch within accepted threshold
- approval from both frontend and backend owners

## 11. Monitoring Requirements
Must monitor:
- request count
- error rate
- latency p50 / p95 / p99
- upstream dependency failures
- reconciliation mismatch count
- audit-log write failures
- unauthorized access attempts
- tenant leakage alarms

## 12. Rollback Plan
### 12.1 Fast Rollback
- disable enterprise feature flags
- route affected pages back to safe default state
- keep enterprise pages read-only if necessary

### 12.2 Full Rollback
- bypass enterprise-bff for enterprise features
- revert frontend to previous build
- stop usage mirror write jobs
- preserve logs and forensic evidence

## 13. Definition of Safe Enough
No system is literally risk-free.
For this project, "safe enough to ship" means:
- no breaking impact on existing core users
- no cross-tenant leakage
- no unaudited write actions
- no irreversible migration in early phases
- proven rollback path
- proven reconciliation path

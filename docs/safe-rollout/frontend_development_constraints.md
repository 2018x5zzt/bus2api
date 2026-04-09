# Frontend Development Constraints
## Project
bus2api Enterprise Console - Safe Frontend Refactor Specification

## 1. Objective
This document defines the frontend development constraints for the enterprise console so that the UI can evolve quickly in a local multi-agent environment without creating risk for the existing sub2api production service.

The frontend must be treated as a presentation layer plus workflow layer only. It must never become the source of truth for billing, permission enforcement, routing policy, quota policy, or enterprise pricing.

## 2. Delivery Goal
Deliver a higher-productivity enterprise admin console with:
- admin navigation
- enterprise usage visibility
- stronger key management UI
- branding support
- safer login / error handling / mobile UX

while preserving backward compatibility with the current production backend.

## 3. Non-Negotiable Constraints
1. The browser must not contain authoritative business logic for:
   - enterprise markups
   - group-based access enforcement
   - tenant isolation
   - budget enforcement
   - routing/account-pool selection
   - final billable amount calculation

2. After the middle layer is introduced, the frontend must call the middle layer only.
   - No direct browser calls to sub2api core endpoints.
   - No mixed mode where some pages call the middle layer and some pages call core directly unless explicitly approved for temporary migration.

3. The frontend must be additive and reversible.
   - Every new page or control must be behind a feature flag.
   - There must be a kill switch that disables enterprise-only pages without rebuilding the app.

4. The frontend must not assume hidden permissions are secure.
   - Hiding buttons is not authorization.
   - Role checks in the UI are only for usability.
   - The backend must still enforce every rule.

5. The frontend must not hardcode production assumptions.
   - No fallback production API base URL.
   - No tenant-specific constants in source.
   - No fixed menu labels or brand text when branding is expected to come from settings.

## 4. Allowed Frontend Scope
### Phase FE-1: Safe UI exposure of already-existing backend capabilities
Allowed:
- add admin routes and guarded admin menus
- role-based layout split
- branding from settings
- richer keys UI fields
- richer usage filters and report pages
- export actions
- loading / empty / error states
- safer mobile navigation
- redirect validation after login

### Phase FE-2: Enterprise workflows on top of the middle layer
Allowed:
- organization switcher
- member management pages
- budget dashboards
- audit log viewer
- invoice and reporting screens
- pricing rule viewer/editor

## 5. Forbidden Frontend Changes
The frontend must not:
- calculate authoritative billable totals in browser-only code
- store pricing rules as the source of truth
- directly mutate core scheduler/account-pool configuration
- bypass the middle layer for convenience
- accept arbitrary post-login redirects
- use local-only feature toggles for security-sensitive features
- expose hidden admin pages without server-side role verification
- keep long-lived secrets in source code or local storage beyond existing temporary compatibility needs

## 6. Required Frontend-to-Middle-Layer Contract
All frontend requests must conform to the following contract rules.

### 6.1 Versioning
- Every request must include `X-Contract-Version`.
- The frontend must fail safely if the version is unsupported.

### 6.2 Traceability
- Every mutating request must include `X-Request-ID`.
- Every mutating request must include `X-Idempotency-Key`.

### 6.3 Error Envelope
All responses must normalize to:
```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "meta": {
    "request_id": "string",
    "contract_version": "v1"
  }
}
```

### 6.4 Pagination Contract
All list endpoints must return:
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "page_size": 20
}
```

### 6.5 Read vs Write Separation
- Read APIs may be cached briefly by the UI.
- Write APIs must never be optimistically trusted for billing-sensitive state.
- After write success, the UI must re-fetch canonical server state.

## 7. UI Modules to Implement
### 7.1 Admin Navigation
- admin dashboard
- users / members
- keys
- usage
- groups
- reports
- audit logs
- settings / branding

### 7.2 Keys Console
Must support:
- create key
- disable / enable key
- delete key
- group binding
- optional custom key
- IP whitelist / blacklist
- rate limit settings
- quota / expiry
- key ownership visibility
- copy action with success/failure feedback

### 7.3 Usage Console
Must support:
- filters by user, key, group, model, date range
- per-user breakdown
- per-group breakdown
- raw usage detail
- actual cost vs billable cost
- multiplier visibility
- CSV export

### 7.4 Branding
Must support:
- site name
- site logo
- site subtitle
- custom menu items
- contact / docs links

### 7.5 Security / UX Fixes
Must support:
- redirect whitelist
- explicit unauthorized state
- better error handling
- retry actions
- mobile drawer instead of only collapsed sidebar

## 8. Frontend Acceptance Criteria
A frontend change is accepted only if all conditions below pass.

### 8.1 Functional
- Admin user can open admin pages without console errors.
- Non-admin user cannot access admin screens even if route is typed manually.
- Key creation UI can send all supported fields required by the middle layer.
- Usage pages can filter and export without breaking pagination.

### 8.2 Safety
- No direct browser requests to sub2api core after middle-layer cutover.
- No external redirect is possible from login.
- No hardcoded fallback production API URL remains.
- No pricing or authorization rule exists only in the browser.

### 8.3 Observability
- Each failed action surfaces a user-visible error message.
- Each mutating action logs `request_id` in browser telemetry.
- Frontend error rate is visible per release.

### 8.4 Regression
- Existing user pages still work after admin console integration.
- Existing login flow still works for non-enterprise users.
- Existing key listing and usage pages still render when enterprise flags are off.

## 9. Frontend Test Plan
### 9.1 Unit Tests
- route guards
- redirect sanitizer
- feature-flag rendering
- error envelope parsing
- pagination helpers

### 9.2 Contract Tests
- generated client against middle-layer schemas
- error envelope compatibility
- pagination schema compatibility

### 9.3 E2E Tests
Required:
1. admin login -> dashboard -> keys -> usage -> logout
2. non-admin login -> attempt `/admin/*` -> denied
3. create key with advanced fields
4. export usage report
5. invalid redirect query -> forced to safe default route
6. middle layer unavailable -> safe error state

### 9.4 Release Gate
Frontend release is blocked if:
- any contract test fails
- any admin route bypass is possible
- any direct production-core call remains after cutover
- any known billing-sensitive field is only rendered from local calculation

## 10. Rollback Requirements
- A feature flag must disable all enterprise pages within minutes.
- The previous frontend build must remain deployable.
- Route definitions for enterprise features must be removable without data migration.

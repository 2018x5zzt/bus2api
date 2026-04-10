# Bus2API Enterprise Console V1 Design

## Goal

Deliver a fast, low-risk first version of `bus2api` as an enterprise administrator console without breaking the existing `sub2api` frontend or changing the live `sub2api` deployment path.

## Product Scope

Version 1 includes:

- company name + account + password login
- enterprise-branded login and shell
- pool status monitoring
- API key management
- usage queries
- no employee login
- no separate enterprise admin backend inside `bus2api`

Version 1 explicitly excludes:

- employee accounts
- department hierarchy
- editing total balance, group multipliers, or pool authorization from `bus2api`
- replacing the existing `sub2api` frontend

## Core Product Decision

An enterprise is modeled as an existing `sub2api` user plus enterprise metadata. The existing `sub2api` admin console remains the source of truth for:

- user total balance
- allowed groups and pool access
- group and user multiplier composition
- user lifecycle management

`bus2api` is the enterprise-facing shell on top of that existing core.

## Architecture

The system keeps the current split:

- `sub2api` remains the core backend and the existing public frontend
- `enterprise-bff` remains the only backend surface used by `bus2api`
- `bus2api` frontend never calls raw `sub2api` browser endpoints directly

The new capability is added by extending `enterprise-bff` with enterprise-aware login and session metadata:

1. `bus2api` sends `company_name + email + password`
2. `enterprise-bff` resolves the authenticated user through the existing `sub2api` login flow
3. `enterprise-bff` verifies that the user belongs to the requested company
4. `enterprise-bff` returns the existing token pair plus enterprise session metadata
5. `bus2api` renders branding and access-scoped views from the BFF only

## Enterprise Identity Model

Version 1 uses existing `sub2api` user attribute infrastructure instead of a new table or risky core migration.

Required user attributes:

- `enterprise_name`
  Used as the login company identifier and routing key. This should be a stable normalized slug or company key.
- `enterprise_display_name`
  Used for UI branding. If absent, fall back to `enterprise_name`.

Optional user attributes:

- `enterprise_logo_url`
- `enterprise_support_contact`

This keeps the enterprise metadata isolated from the core login model and makes rollout reversible.

## Backend Changes

`enterprise-bff` gets four additions:

1. enterprise-aware login endpoint behavior for `/auth/login`
2. enterprise-aware 2FA completion for `/auth/login/2fa`
3. enterprise session/profile enrichment for `/auth/me`
4. enterprise branding enrichment for `/settings/public`

Implementation rules:

- reuse the existing upstream core login endpoints
- validate enterprise membership inside the BFF using the local database connection
- reject logins where company name does not match the user attribute
- expose normalized enterprise metadata in the returned user/session payload
- do not change `sub2api` public frontend responses or routes

## Frontend Changes

`bus2api` frontend changes are intentionally limited:

- login page adds company name input
- auth types/store handle enterprise metadata
- app shell branding reads enterprise display name from session/public settings
- admin-only router structure is simplified into one enterprise management console
- navigation is reduced to dashboard, pool status, keys, and usage

## Isolation and Safety

The rollout safety rule is:

- do not modify the live `sub2api` container entrypoint or existing public reverse proxy path
- validate `bus2api` through `enterprise-bff` canary routing first
- make all new behavior additive to `enterprise-bff`
- keep the original `sub2api` frontend serving from the `sub2api` container unchanged

## Testing Strategy

Backend:

- BFF unit tests for enterprise attribute lookup
- failing tests for company mismatch login rejection
- tests for `/auth/me` enterprise metadata enrichment
- tests for `/settings/public` enterprise branding enrichment

Frontend:

- login form validation test for required company name
- auth store test for enterprise login payload
- route/access tests for enterprise administrator flow
- production build verification

## Deployment Strategy

1. implement and verify in isolated worktrees
2. build and validate `enterprise-bff` separately from live `sub2api`
3. build and validate `bus2api` frontend separately
4. deploy to canary path first
5. verify login, pool status, keys, and usage manually
6. only then promote traffic

## Rollback

Rollback is straightforward because version 1 is additive:

- point `bus2api` frontend traffic back to the previous image
- point BFF traffic back to the previous image
- keep the existing `sub2api` container untouched

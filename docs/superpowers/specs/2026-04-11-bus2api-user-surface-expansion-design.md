# Bus2API User Surface Expansion Design

## Goal

Expand the enterprise-user-facing `bus2api` surface so it feels materially closer to the useful parts of the original `sub2api` user frontend, while keeping enterprise safety boundaries intact and preserving one explicit product rule:

- an API key may choose `group_id` only at creation time
- an existing API key must not be allowed to change its bound group from `bus2api`

## Constraints

- `bus2api` remains an enterprise-facing frontend, not a second full admin console.
- `enterprise-bff` remains the only backend surface used by `bus2api`.
- The implementation must prefer existing user-scoped or enterprise-safe endpoints over new global admin endpoints.
- Tenant-safe data may be exposed only when it is scoped to the current authenticated user or the current user’s visible enterprise groups.
- Global operational data, cross-tenant data, and raw infrastructure internals must not be exposed in `bus2api`.
- The existing `sub2api` public-user behavior must not regress.

## Product Scope

This design includes:

- richer API key management for enterprise users
- richer user-scoped dashboard metrics and charts
- enterprise-safe pool-health summary on the dashboard
- preserving the existing `bus2api` restriction that key group binding is immutable after creation

This design excludes:

- changing an existing key’s `group_id`
- exposing admin-only operations dashboards
- exposing other users’ data or full-platform aggregates
- turning `bus2api` into a replacement for the original `sub2api` admin frontend

## Current State

Current `bus2api` is intentionally thinner than the original `sub2api` user frontend.

Today the `bus2api` key page supports:

- list, search, filter
- create key with `name`, `group_id`, quota, expiry-in-days, IP lists, and rate limits
- enable or disable
- delete

Today the `bus2api` dashboard supports:

- balance
- total keys and active keys
- today requests and today cost
- total requests and total cost
- a trend chart
- a model-usage chart

The backend surface already exposes enough enterprise-safe user endpoints to support a broader user dashboard and richer per-key visibility. The gap is primarily product scope and frontend implementation, not a missing same-core architecture.

## Core Product Decision

`bus2api` should adopt a “richer user shell, still enterprise-safe” position.

That means:

- add user-visible capabilities that help an enterprise user operate their own keys and understand their own usage
- keep enterprise restrictions where they simplify governance or reduce accidental misuse
- do not mirror global operations features that belong to platform administrators

The key immutability rule is explicit:

- key group is selected only when creating a key
- after a key exists, `bus2api` must not expose UI or request paths that allow changing `group_id`

This is a deliberate product restriction even though the underlying backend contract can technically support `group_id` updates.

## Recommended Approach

Implement the expansion in two layers:

- `bus2api` frontend grows the user-visible key and dashboard features
- `enterprise-bff` continues to be the enterprise-safe policy and contract boundary, with additive passthrough or enterprise-safe enrichment only when the current contract is insufficient

This is preferred over calling raw `sub2api` endpoints from the browser because:

- it preserves the existing architecture
- it keeps policy enforcement in one place
- it avoids leaking global or cross-tenant data through accidental frontend coupling

## API Key Surface

### Behavior Rules

The API key page should become materially more capable, but with one hard restriction:

- create: may select `group_id`
- edit existing key: must not allow changing `group_id`

If the edit surface is introduced, the form must omit group selection entirely for existing keys. If the frontend sends update requests, it must not include `group_id` in edit mode.

### Features To Add

`bus2api` should add the following user-visible key capabilities:

- edit key name
- enable or disable key
- edit IP whitelist
- edit IP blacklist
- edit quota
- edit expiration
- edit `rate_limit_5h`
- edit `rate_limit_1d`
- edit `rate_limit_7d`
- reset quota usage
- reset rate-limit usage
- optional custom key at creation time
- show `last_used_at`
- show today and total usage per key
- show quota progress
- show per-window rate-limit usage and next reset time
- show a “how to use this key” helper modal or equivalent quick-start entry

### Features Explicitly Excluded

The following remain out of scope for `bus2api`:

- changing `group_id` after key creation
- arbitrary raw request replay or debugging tools
- global key analytics across other users or enterprises

### UX Rules

The UI should make the immutability rule obvious instead of merely omitting it silently.

Recommended behavior:

- create dialog includes group selection
- edit dialog does not include group selection
- key details may display the bound group as read-only metadata
- helper copy should make clear that the bound group is fixed after creation

This reduces support ambiguity and avoids users assuming the feature is temporarily broken.

## Dashboard Surface

### Summary Cards

`bus2api` should expand the current dashboard summary beyond request and cost counts.

The recommended summary set is:

- balance
- total keys
- active keys
- today requests
- total requests
- today cost
- total cost
- today tokens
- total tokens
- today input tokens
- today output tokens
- RPM
- TPM
- average response time

These are user-scoped metrics and fit the enterprise-user use case without exposing tenant-external data.

### Charts and Lists

The dashboard should become more exploratory without becoming an admin console.

Recommended additions:

- trend chart with time-range switching such as `7d` and `30d`
- trend granularity switching such as `day` and `hour` where the backend supports it
- model usage breakdown
- recent usage list
- top API keys by recent usage or spend

The recent-usage list is important because it closes the loop between aggregate cards and real activity. It helps users answer “what just happened” without navigating immediately to the full usage page.

### Enterprise-Safe Operations Summary

The dashboard may expose a lightweight pool-health summary using enterprise-safe pool status data already scoped to visible groups.

Allowed dashboard pool summary content:

- visible pool count
- overall health percent
- health state summary
- last updated time

Optional per-group preview content:

- group name
- group health percent
- short trend sparkline

Explicitly disallowed in `bus2api` pool summary:

- raw account totals
- raw available-account counts
- raw rate-limited-account counts
- internal scheduler details
- global alerts spanning other tenants

## Data Sources and Backend Contract Rules

The expansion should prefer existing enterprise-safe user routes.

Preferred sources:

- `/usage/dashboard/stats`
- `/usage/dashboard/trend`
- `/usage/dashboard/models`
- `/usage/dashboard/api-keys-usage`
- `/usage`
- `/groups/pool-status`
- `/keys`
- `/keys/:id`

Contract rule:

- if required fields already exist in the enterprise-safe user-scoped contract, the frontend should consume them directly
- if a field is missing, add it through user-scoped passthrough or enterprise-safe enrichment in `enterprise-bff`
- do not satisfy missing frontend needs by switching to admin/global endpoints

For key editing:

- create requests may include `group_id`
- edit requests must not include `group_id`
- `enterprise-bff` may continue to authorize `group_id` on create paths
- `enterprise-bff` should reject any key-update request that includes `group_id` on the enterprise user path with a business-safe validation error

## Priority and Phasing

### P0

Highest-value additions with the lowest product ambiguity:

- key edit dialog without group editing
- custom key on create
- `last_used_at`
- reset quota usage
- reset rate-limit usage

### P1

High-value dashboard expansion:

- token cards
- performance cards for RPM, TPM, and average response time
- trend range and granularity controls
- recent usage list
- top key usage summary

### P2

Nice-to-have finishing work:

- enterprise-safe pool-health summary card on the homepage
- richer quick-start help for key usage
- more polished chart interactions and empty states

## Error Handling

The design should fail safely and predictably.

API key rules:

- if a user edits a key, the UI must not offer group changes
- if a crafted request still attempts to change `group_id`, the backend path must reject it explicitly instead of ignoring it silently
- reset actions should use explicit success and failure notifications

Dashboard rules:

- a partial failure should not blank the entire dashboard when some cards or charts can still render
- missing or delayed enterprise-safe pool data should degrade to an empty or unavailable state rather than a page-wide hard failure
- user-facing errors should stay business-safe and should not reveal internal infrastructure details

## Testing Strategy

Frontend tests:

- existing-key edit flow does not render a group selector
- create-key flow still renders group selector
- edit submit payload does not include `group_id`
- create submit payload may include `group_id`
- reset quota action submits the expected request
- reset rate-limit action submits the expected request
- dashboard cards render token and performance fields correctly
- trend controls request the expected range and granularity
- recent usage list and top-key panels degrade cleanly when data is empty

Backend and contract tests:

- enterprise-safe routes stay user-scoped
- create-key with allowed `group_id` still works
- crafted edit-key requests with `group_id` are rejected on the enterprise user path
- pool-health summary payload remains redacted
- no dashboard implementation step introduces dependence on admin/global endpoints

Verification:

- manual validation of key create, edit, reset, enable/disable, and delete
- manual validation that a key created under one group cannot be re-bound from `bus2api`
- manual validation of dashboard metrics on desktop and mobile layouts

## Rollout Strategy

Rollout should follow the product priority order:

1. ship P0 API key improvements first
2. ship P1 dashboard expansion second
3. ship P2 polish and pool summary last

This keeps the implementation incremental and lets the team validate the immutability rule before broadening the dashboard surface.

## Acceptance Criteria

This design is successful when all of the following are true:

- `bus2api` users can manage keys meaningfully beyond create, toggle, and delete
- `bus2api` still does not allow changing an existing key’s bound group
- the homepage exposes more of the useful user-scoped metrics already supported by the shared backend
- no new `bus2api` surface leaks global platform operations data
- the expanded UI still feels like an enterprise user console rather than a platform admin console

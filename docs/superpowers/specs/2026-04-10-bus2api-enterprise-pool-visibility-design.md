# Bus2API Enterprise Pool Visibility Design

## Goal

Tighten enterprise pool visibility in `bus2api` so enterprise users only see explicitly assigned groups, no absolute account counts are exposed, and pool health trends come from shared backend history without changing the existing `sub2api` public-user behavior.

## Constraints

- The existing `sub2api` service and public frontend behavior must remain stable.
- Enterprise access control changes must not alter normal `sub2api` user semantics.
- Enterprise users, including enterprise admins, must not inherit `public` groups by default.
- Enterprise status pages must expose health state, percentage, and trend only, not raw account counts.
- There is no platform hard restriction in this phase. The system must not permanently hardcode `openai`-only visibility rules.
- Current health calculation logic remains unchanged in this phase, including any existing `claude` behavior.
- Health history should be reusable later for normal `sub2api` users, not just enterprise users.

## Product Scope

This design includes:

- enterprise-only visible group filtering
- enterprise-only pool status payload redaction
- enterprise frontend status-page redesign around health-only presentation
- shared backend health history collection for pool trend display
- enterprise write-path enforcement for `group_id`-bound API key operations

This design excludes:

- changing the underlying pool health calculation formulas
- forcing platform-level allowlists such as `openai`-only groups
- changing normal `sub2api` public group inheritance rules for non-enterprise users
- exposing `claude` pool health to enterprise users by policy inside this implementation

## Recommended Approach

Implement the behavior split across two layers:

- `sub2api` backend adds shared health snapshot history collection and a reusable trend source
- `enterprise-bff` becomes the enforcement and redaction layer for enterprise visibility and enterprise write-path authorization
- `bus2api` frontend renders the enterprise-safe contract and removes all absolute count displays

This keeps the existing core public-user semantics intact while isolating enterprise-specific rules to the enterprise access path.

## Access Model

Enterprise visibility is defined by explicit assignment only.

- Enterprise users do not inherit `public` groups.
- The same rule applies to enterprise admins.
- The default enterprise state is zero visible groups.
- A group becomes visible only when the target user has been explicitly assigned that group through the existing admin tooling.
- If a user has zero visible groups, enterprise pages must show an explicit empty state such as `暂无可用号池`.

The visibility rule is enterprise-path-specific.

- Normal `sub2api` users keep the current `public` group behavior.
- The enterprise restriction must live in `enterprise-bff` or in enterprise-specific request handling, not in global public-user permission logic.

## Pool Status Contract

The enterprise `/groups/pool-status` contract must no longer transparently proxy the core payload.

`enterprise-bff` should:

1. resolve the current enterprise user
2. determine which groups are explicitly visible to that user
3. fetch or derive the current pool health for those groups
4. redact raw count data
5. return an enterprise-safe response contract

Per-group fields exposed to enterprise frontend:

- `group_id`
- `group_name`
- `health_percent`
- `health_state`
- `trend`
- `updated_at`

Top-level fields exposed to enterprise frontend:

- `visible_group_count`
- `overall_health_percent`
- `updated_at`
- `groups`

Fields explicitly excluded from enterprise payloads:

- `available_account_count`
- `rate_limited_account_count`
- `total_accounts`
- any top-level aggregate raw account totals

Behavioral rules:

- when the user has no visible groups, return `200` with an empty `groups` list
- when part of the upstream state is unavailable, degrade only affected groups instead of failing the whole page when possible
- when status data cannot be resolved at all, return a generic enterprise-safe failure without leaking raw upstream details

## Health Trend History

Trend data should move from frontend polling history to shared backend history.

Current enterprise trend lines are built from page-open polling. That is insufficient because:

- history only exists while a page is open
- enterprise and future public-user views would drift from each other
- users cannot see recent history immediately on page load

The new design is:

- `sub2api` backend records pool-health snapshots every minute
- the collector runs passively in the backend and does not rely on any frontend trigger
- history retention is 30 days
- collection failure must not affect the main request path

Each stored snapshot only needs the minimum trend-safe fields:

- `group_id`
- `bucket_time`
- `health_percent`
- `health_state`

This deliberately avoids storing raw account totals in the trend-history record so later reuse for public users does not create a new count-leak path.

The initial frontend read window can focus on recent history such as the last 24 hours or last 7 days while the backend keeps 30 days of data available for later product expansion.

## Enterprise Write-Path Enforcement

Frontend restrictions are not sufficient because the current enterprise key UI can still submit numeric `group_id` values directly.

All enterprise write paths that accept or update `group_id` must be validated in `enterprise-bff`, including:

- user `POST /keys`
- user `PUT/PATCH /keys/:id`
- enterprise-admin create-key flows for target users
- enterprise-admin update-key flows

Authorization rules:

- the target user must be an enterprise user
- if an admin acts on another user, the target user must belong to the same enterprise scope
- the requested `group_id` must be explicitly assigned to the target user
- `public` status must not create an exception

Error behavior:

- reject unauthorized group binding with business-safe messages such as `无权使用该号池`
- do not leak whether the group is public, how many accounts it contains, or any other operational detail

For keys already bound to a group that later becomes unauthorized:

- listing the key may still show its existing binding for continuity
- creating a new key on that group must be rejected
- updating a key to that unauthorized group must be rejected

## Frontend Behavior

Enterprise `bus2api` status UI should show health-only information.

Page-level summary:

- visible pool count
- overall health percentage
- updated time

Per-pool card:

- group name
- health percentage
- health color state
- trend curve when history exists
- `暂无趋势数据` when history is not yet available

The frontend must remove all displays of:

- available account counts
- limited account counts
- total account counts
- any explanatory copy that reveals absolute pool size

Empty-state behavior:

- if the current user has no visible groups, show `暂无可用号池`
- supporting copy should direct the user to contact an administrator
- summary area may still show `可用号池 0` and an unavailable overall-health placeholder

Any enterprise UI that offers group selection for API keys should display only visible groups. If no group is visible, the UI should communicate that clearly instead of encouraging blind `group_id` entry.

## Architecture Boundaries

The responsibility split is:

- `sub2api` core: compute current health using existing logic and maintain reusable trend history
- `enterprise-bff`: enforce enterprise visibility, redact enterprise-safe responses, validate enterprise write paths
- `bus2api`: render enterprise-safe data only

This boundary keeps enterprise-specific policy separate from the public-user core path and minimizes regression risk to the existing `sub2api` service.

## Testing Strategy

Backend contract and enforcement tests:

- enterprise users do not inherit `public` groups
- enterprise admins do not inherit `public` groups
- `/groups/pool-status` returns only explicitly assigned groups
- enterprise pool-status payload omits raw account-count fields
- no-visible-group case returns `200` with an empty `groups` list
- unauthorized `group_id` create and update requests are rejected
- admin-on-behalf-of-user requests validate target-user group authorization

Health-history tests:

- minute-level snapshot collector runs on schedule
- snapshot collector stores only minimal trend-safe fields
- collector failures do not break serving APIs
- 30-day retention cleanup behaves correctly
- trend queries degrade cleanly when no history exists yet

Frontend tests:

- status page renders no raw account totals
- status page renders health percentage and state correctly
- empty state renders when zero visible groups are returned
- no-trend state renders when history is absent
- key-management UI reacts correctly when zero visible groups exist

Regression verification:

- normal `sub2api` public-user group visibility remains unchanged
- normal `sub2api` key behavior remains unchanged outside enterprise path

## Rollout and Safety

Rollout should be staged:

1. add backend health-history collection
2. add enterprise-bff visibility and write-path enforcement
3. switch enterprise frontend to the redacted contract
4. enable trend rendering from backend history

Verification after rollout must explicitly confirm:

- existing `sub2api` public-user flows still work
- enterprise users only see explicitly assigned groups
- enterprise users do not see absolute account counts
- unauthorized `group_id` submissions are rejected

Rollback scope should stay enterprise-local whenever possible:

- revert `enterprise-bff` enterprise visibility enforcement
- revert `bus2api` enterprise frontend rendering
- keep the main `sub2api` public service untouched unless a shared history component proves unstable

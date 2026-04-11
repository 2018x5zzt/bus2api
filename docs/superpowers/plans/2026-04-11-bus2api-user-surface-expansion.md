# Bus2API User Surface Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `bus2api` API key and dashboard surfaces while preserving the rule that an existing key's `group_id` cannot be changed from the enterprise user path.

**Architecture:** Keep `enterprise-bff` as the only backend surface used by `bus2api`. Enforce immutable key-group binding in the BFF update path, then expand the `bus2api` frontend to expose richer key editing, reset actions, and user-scoped dashboard metrics using existing enterprise-safe routes.

**Tech Stack:** Vue 3, Pinia, Vitest, Axios, Gin, Go tests

---

### Task 1: Lock Enterprise User Key Rebinding in BFF

**Files:**
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/key_authorization.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/server.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/key_authorization_test.go`

- [ ] **Step 1: Write the failing test**

Add an enterprise-user-path test that sends `PATCH /keys/:id` with `group_id` and expects `400` or `403` without calling upstream.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/enterprisebff -run TestEnterpriseUserKeyUpdateRejectsGroupRebind -count=1`
Expected: FAIL because current user path still forwards `group_id` updates.

- [ ] **Step 3: Implement minimal guard**

Add enterprise-user-path validation so:

```go
if c.Request.Method != http.MethodPost && binding.Present {
  c.JSON(http.StatusBadRequest, gin.H{
    "code": http.StatusBadRequest,
    "message": "现有 Key 不支持修改绑定号池",
  })
  return
}
```

Keep create-path `group_id` authorization unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/enterprisebff -run 'TestEnterpriseUserKey(UpdateRejectsGroupRebind|CreateRejectsUnauthorizedGroupID)' -count=1`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /root/sub2api-src add internal/enterprisebff/key_authorization.go internal/enterprisebff/server.go internal/enterprisebff/key_authorization_test.go
git -C /root/sub2api-src commit -m "feat: block enterprise key group rebinding"
```

### Task 2: Expand Bus2API Key Management Surface

**Files:**
- Modify: `/root/bus2api/frontend/src/views/keys/KeysView.vue`
- Modify: `/root/bus2api/frontend/src/views/keys/__tests__/KeysView.spec.ts`
- Modify: `/root/bus2api/frontend/src/api/keys.ts`
- Modify: `/root/bus2api/frontend/src/types/keys.ts`
- Modify: `/root/bus2api/frontend/src/i18n/locales/zh.ts`
- Modify: `/root/bus2api/frontend/src/i18n/locales/en.ts`

- [ ] **Step 1: Write failing frontend tests**

Add tests that cover:

```ts
it('opens edit without group selector and submits update payload without group_id')
it('renders last used time and reset actions for editable keys')
it('creates a key with custom_key and group_id')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/views/keys/__tests__/KeysView.spec.ts`
Expected: FAIL because edit/reset/custom-key behavior is not implemented.

- [ ] **Step 3: Implement minimal key-surface changes**

Implement:

```ts
type EditKeyForm = {
  name: string
  status: 'active' | 'inactive'
  custom_key: string
  ip_whitelist_raw: string
  ip_blacklist_raw: string
  quota: number
  expires_at: string
  rate_limit_5h: number
  rate_limit_1d: number
  rate_limit_7d: number
}
```

Add:
- edit modal without `group_id`
- update payload without `group_id`
- reset quota button using `keysAPI.update(id, { reset_quota: true })`
- reset rate-limit button using `keysAPI.update(id, { reset_rate_limit_usage: true })`
- create-time `custom_key`
- read-only bound-group display
- `last_used_at` column

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/views/keys/__tests__/KeysView.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add frontend/src/views/keys/KeysView.vue frontend/src/views/keys/__tests__/KeysView.spec.ts frontend/src/api/keys.ts frontend/src/types/keys.ts frontend/src/i18n/locales/zh.ts frontend/src/i18n/locales/en.ts
git -C /root/bus2api commit -m "feat: expand bus2api key management"
```

### Task 3: Expand Bus2API Dashboard Surface

**Files:**
- Modify: `/root/bus2api/frontend/src/views/dashboard/DashboardView.vue`
- Create or Modify: `/root/bus2api/frontend/src/views/dashboard/__tests__/DashboardView.spec.ts`
- Modify: `/root/bus2api/frontend/src/api/usage.ts`
- Modify: `/root/bus2api/frontend/src/api/groups.ts`
- Modify: `/root/bus2api/frontend/src/types/usage.ts`
- Modify: `/root/bus2api/frontend/src/types/groups.ts`
- Modify: `/root/bus2api/frontend/src/i18n/locales/zh.ts`
- Modify: `/root/bus2api/frontend/src/i18n/locales/en.ts`

- [ ] **Step 1: Write failing dashboard tests**

Add tests that cover:

```ts
it('renders token and performance summary cards from dashboard stats')
it('requests trend data with selected range and granularity')
it('renders recent usage and pool health summary when data exists')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/views/dashboard/__tests__/DashboardView.spec.ts`
Expected: FAIL because current dashboard only shows the thin card set and basic charts.

- [ ] **Step 3: Implement minimal dashboard expansion**

Use existing user-scoped APIs:

```ts
await Promise.all([
  usageAPI.getDashboardStats(),
  usageAPI.getDashboardTrend({ start_date, end_date, granularity }),
  usageAPI.getDashboardModels({ start_date, end_date }),
  usageAPI.query({ page: 1, page_size: 5 }),
  groupsAPI.getPoolStatus(),
])
```

Add:
- token cards
- RPM / TPM / average response time cards
- range + granularity controls
- recent usage list
- pool health summary card

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/views/dashboard/__tests__/DashboardView.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add frontend/src/views/dashboard/DashboardView.vue frontend/src/views/dashboard/__tests__/DashboardView.spec.ts frontend/src/api/usage.ts frontend/src/api/groups.ts frontend/src/types/usage.ts frontend/src/types/groups.ts frontend/src/i18n/locales/zh.ts frontend/src/i18n/locales/en.ts
git -C /root/bus2api commit -m "feat: expand bus2api dashboard"
```

### Task 4: Verify and Publish

**Files:**
- Modify: any touched files from Tasks 1-3 if verification reveals issues

- [ ] **Step 1: Run targeted frontend tests**

Run: `npm test -- --run src/views/keys/__tests__/KeysView.spec.ts src/views/dashboard/__tests__/DashboardView.spec.ts src/views/status/__tests__/StatusView.spec.ts`
Expected: PASS

- [ ] **Step 2: Run targeted backend tests**

Run: `go test ./internal/enterprisebff -count=1`
Expected: PASS

- [ ] **Step 3: Run build-level verification**

Run: `npm run build`
Expected: successful production build with no type errors

- [ ] **Step 4: Commit integration fixes**

```bash
git -C /root/bus2api add frontend
git -C /root/bus2api commit -m "test: verify bus2api user surface expansion"
```

- [ ] **Step 5: Push branch**

```bash
git -C /root/sub2api-src push origin HEAD
git -C /root/bus2api push origin HEAD
```

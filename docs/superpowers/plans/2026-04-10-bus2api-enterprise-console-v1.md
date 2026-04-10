# Bus2API Enterprise Console V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first enterprise-facing `bus2api` console with company-name login, enterprise branding, pool status, API key management, and usage queries without breaking the existing `sub2api` frontend.

**Architecture:** Keep `sub2api` as the core backend and original frontend, and make `enterprise-bff` the only backend surface for `bus2api`. Reuse existing user attributes for enterprise metadata so rollout stays additive and reversible.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Go, Gin, ent, PostgreSQL, Docker

---

### Task 1: Add Enterprise Session Metadata to `enterprise-bff`

**Files:**
- Modify: `backend/internal/enterprisebff/auth.go`
- Modify: `backend/internal/enterprisebff/server.go`
- Modify: `backend/internal/enterprisebff/config.go`
- Create or modify: `backend/internal/enterprisebff/enterprise.go`
- Test: `backend/internal/enterprisebff/server_test.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestEnterpriseLoginRejectsCompanyMismatch(t *testing.T) {}
func TestAuthMeIncludesEnterpriseMetadata(t *testing.T) {}
func TestPublicSettingsIncludeEnterpriseBranding(t *testing.T) {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/enterprisebff/...`
Expected: FAIL because enterprise metadata lookup and mismatch rejection do not exist.

- [ ] **Step 3: Write minimal implementation**

```go
type enterpriseProfile struct {
    Name        string `json:"enterprise_name"`
    DisplayName string `json:"enterprise_display_name"`
}
```

```go
func (s *Server) requireEnterpriseMatch(ctx context.Context, userID int64, companyName string) (*enterpriseProfile, error) {
    // load user attributes from ent, normalize company, compare, return profile
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/enterprisebff/...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/enterprisebff
git commit -m "feat(bff): add enterprise-aware session metadata"
```

### Task 2: Add Company Name Login to `bus2api` Frontend

**Files:**
- Modify: `frontend/src/views/auth/LoginView.vue`
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/i18n/index.ts`

- [ ] **Step 1: Write the failing test or type check target**

```ts
type LoginRequest = {
  company_name: string
  email: string
  password: string
}
```

- [ ] **Step 2: Run verification to prove the existing frontend does not support it**

Run: `cd frontend && npm run build`
Expected: either existing login form has no company field or types do not include company-aware payload.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface LoginRequest {
  company_name: string
  email: string
  password: string
}
```

```vue
<input v-model="companyName" type="text" class="input" required />
```

- [ ] **Step 4: Run build to verify it passes**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): add company-aware login"
```

### Task 3: Simplify the Enterprise Console Shell

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/stores/app.ts`
- Modify: `frontend/src/layouts/ConsoleLayout.vue`
- Modify: `frontend/src/views/dashboard/DashboardView.vue`

- [ ] **Step 1: Write the failing behavior target**

```ts
// enterprise console should expose only dashboard, status, keys, and usage
```

- [ ] **Step 2: Run build to verify current shell still exposes broader admin surfaces**

Run: `cd frontend && npm run build`
Expected: build succeeds but router and shell still expose routes beyond the intended scope.

- [ ] **Step 3: Write minimal implementation**

```ts
const enterpriseRoutes = ['dashboard', 'status', 'keys', 'usage']
```

```ts
const siteName = computed(() => publicSettings.value?.enterprise_display_name || publicSettings.value?.site_name || 'Bus2API')
```

- [ ] **Step 4: Run build to verify it passes**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): scope bus2api to enterprise console v1"
```

### Task 4: Prepare Isolated Deployment Assets

**Files:**
- Modify: `frontend/nginx.conf`
- Modify: `backend/Dockerfile.enterprise-bff`
- Modify: `deploy/docker-compose.enterprise-bff.yml`

- [ ] **Step 1: Write the failing verification target**

```bash
docker compose -f deploy/docker-compose.enterprise-bff.yml config
```

- [ ] **Step 2: Run verification to confirm current assets are incomplete for company-aware rollout**

Run: `cd /root/.config/superpowers/worktrees/sub2api-src/feat-enterprise-console-v1 && docker compose -f deploy/docker-compose.enterprise-bff.yml config`
Expected: configuration lacks the new enterprise metadata environment or rollout notes.

- [ ] **Step 3: Write minimal implementation**

```yaml
environment:
  - ENTERPRISE_ATTRIBUTE_KEY=enterprise_name
  - ENTERPRISE_DISPLAY_NAME_ATTRIBUTE_KEY=enterprise_display_name
```

- [ ] **Step 4: Run verification to verify config resolves**

Run: `cd /root/.config/superpowers/worktrees/sub2api-src/feat-enterprise-console-v1 && docker compose -f deploy/docker-compose.enterprise-bff.yml config`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/nginx.conf backend/Dockerfile.enterprise-bff deploy/docker-compose.enterprise-bff.yml
git commit -m "chore(deploy): prepare enterprise console rollout assets"
```

# Bus2API Enterprise Pool Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship enterprise-only pool visibility and `group_id` write-path enforcement so enterprise users only see explicitly assigned groups, never see raw pool counts, and read trend history from shared backend snapshots without changing normal `sub2api` public-user behavior.

**Architecture:** Keep `sub2api` responsible for the existing realtime health calculation and add a shared minute-level snapshot store there. Make `enterprise-bff` the only place that filters enterprise-visible groups, redacts pool payloads, and rejects unauthorized `group_id` writes. Cut `bus2api` frontend to a new frozen `v2` browser contract that renders health-only status cards and uses a visible-group selector instead of numeric `group_id` entry.

**Tech Stack:** Go, Gin, ent, PostgreSQL, Wire, Vue 3, Vite, Vitest, Axios

**Repo Roots:** `/root/sub2api-src` for backend and BFF work, `/root/bus2api` for contract docs and enterprise frontend work.

---

## File Map

### `/root/sub2api-src/backend`

- `/root/sub2api-src/backend/internal/service/group_pool_health.go`: shared health-state calculator reused by the user handler, the snapshot collector, and enterprise redaction code.
- `/root/sub2api-src/backend/internal/service/group_pool_health_test.go`: locks the current health ratio and state rules so the new collector does not drift.
- `/root/sub2api-src/backend/internal/service/group_health_snapshot.go`: service-layer snapshot DTO and repository contract.
- `/root/sub2api-src/backend/ent/schema/group_health_snapshot.go`: new ent table for minute buckets retained for 30 days.
- `/root/sub2api-src/backend/internal/repository/group_health_snapshot_repo.go`: snapshot upsert, recent-history query, and retention cleanup.
- `/root/sub2api-src/backend/internal/repository/group_health_snapshot_repo_integration_test.go`: verifies persistence, ordering, and cleanup semantics.
- `/root/sub2api-src/backend/internal/repository/wire.go`: exposes the new snapshot repository to Wire.
- `/root/sub2api-src/backend/internal/handler/api_key_handler.go`: keeps the current public `/groups/pool-status` behavior but reads the shared calculator instead of duplicating math.
- `/root/sub2api-src/backend/internal/service/group_health_history_service.go`: minute-level passive collector with best-effort logging and 30-day cleanup.
- `/root/sub2api-src/backend/internal/service/group_health_history_service_test.go`: verifies snapshot creation and cleanup behavior.
- `/root/sub2api-src/backend/internal/service/wire.go`: starts the collector with fixed one-minute cadence and 30-day retention.
- `/root/sub2api-src/backend/cmd/server/wire.go`: stops the collector during shutdown.

### `/root/sub2api-src/backend/internal/enterprisebff`

- `/root/sub2api-src/backend/internal/enterprisebff/enterprise.go`: resolves enterprise profiles, visible groups, and same-enterprise checks from `allowed_groups` plus active subscriptions.
- `/root/sub2api-src/backend/internal/enterprisebff/pool_status.go`: filtered `/groups/available` and redacted `/groups/pool-status` handlers.
- `/root/sub2api-src/backend/internal/enterprisebff/pool_status_test.go`: locks no-public-inheritance, empty-state, and redaction behavior.
- `/root/sub2api-src/backend/internal/enterprisebff/key_authorization.go`: shared parser and authorization helper for optional `group_id` writes.
- `/root/sub2api-src/backend/internal/enterprisebff/key_authorization_test.go`: covers user/admin rejection rules and nil-or-absent `group_id` semantics.
- `/root/sub2api-src/backend/internal/enterprisebff/server.go`: wires new routes, injects the snapshot repository, and replaces transparent key mutation proxying with validated forwarding.
- `/root/sub2api-src/backend/internal/enterprisebff/server_test.go`: keeps constructor/runtime coverage in sync with the new dependencies.

### `/root/bus2api`

- `/root/bus2api/contracts/enterprise_bff_openapi_v2.yaml`: new frozen browser-facing contract version for visible groups, redacted pool status, and enterprise key writes.
- `/root/bus2api/contracts/README.md`: marks `v2` as active while keeping `v1` frozen.
- `/root/bus2api/frontend/src/lib/contract-headers.ts`: bumps the frontend contract header from `v1` to `v2`.
- `/root/bus2api/frontend/package.json`: adds frontend test scripts and Vitest dependencies.
- `/root/bus2api/frontend/package-lock.json`: records the new frontend test dependencies.
- `/root/bus2api/frontend/vitest.config.ts`: jsdom-based test config with the existing alias and Vite plugins.
- `/root/bus2api/frontend/src/test/setup.ts`: shared browser stubs used by view tests.
- `/root/bus2api/frontend/src/api/groups.ts`: reads `/groups/available` and the redacted `/groups/pool-status` payload.
- `/root/bus2api/frontend/src/types/groups.ts`: enterprise-safe status and visible-group types.
- `/root/bus2api/frontend/src/views/status/StatusView.vue`: health-only status cards backed by server trend data.
- `/root/bus2api/frontend/src/views/status/__tests__/StatusView.spec.ts`: locks no-count rendering, empty state, and no-trend copy.
- `/root/bus2api/frontend/src/views/keys/KeysView.vue`: visible-group dropdowns for filtering and create flows.
- `/root/bus2api/frontend/src/views/keys/__tests__/KeysView.spec.ts`: locks dropdown-only selection and zero-visible-group behavior.
- `/root/bus2api/frontend/src/i18n/index.ts`: updated Chinese and English copy for status and keys views.

### Dependency Order

1. Freeze `v2` contract before changing frontend headers.
2. Add shared health math and snapshot persistence before the enterprise BFF reads history.
3. Land BFF visibility/redaction before frontend view rewrites.
4. Add frontend test harness before view-level specs.

### Task 1: Freeze The Enterprise BFF `v2` Contract

**Files:**
- Create: `/root/bus2api/contracts/enterprise_bff_openapi_v2.yaml`
- Modify: `/root/bus2api/contracts/README.md`
- Modify: `/root/bus2api/frontend/src/lib/contract-headers.ts`

- [ ] **Step 1: Write the failing contract/version assertions**

```bash
test -f /root/bus2api/contracts/enterprise_bff_openapi_v2.yaml
grep -n "version: v2" /root/bus2api/contracts/enterprise_bff_openapi_v2.yaml
grep -n "CONTRACT_VERSION = 'v2'" /root/bus2api/frontend/src/lib/contract-headers.ts
```

- [ ] **Step 2: Run the assertions to prove `v2` does not exist yet**

Run: `test -f /root/bus2api/contracts/enterprise_bff_openapi_v2.yaml && grep -n "CONTRACT_VERSION = 'v2'" /root/bus2api/frontend/src/lib/contract-headers.ts`
Expected: FAIL because the frozen `v2` contract file is missing and the frontend still sends `v1`.

- [ ] **Step 3: Write the minimal contract and header implementation**

```yaml
openapi: 3.0.3
info:
  title: bus2api Enterprise BFF API
  version: v2
paths:
  /groups/available:
    get:
      summary: List enterprise-visible groups for the current user
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VisibleGroupListEnvelope'
  /groups/pool-status:
    get:
      summary: List redacted enterprise pool health
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EnterprisePoolStatusEnvelope'
  /keys:
    post:
      summary: Create an enterprise key with server-side `group_id` authorization
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyEnvelope'
  /keys/{id}:
    put:
      summary: Update an enterprise key with server-side `group_id` authorization
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyEnvelope'
components:
  schemas:
    VisibleGroup:
      type: object
      required: [id, name, platform]
      properties:
        id: { type: integer }
        name: { type: string }
        platform: { type: string }
    EnterprisePoolStatusGroup:
      type: object
      required: [group_id, group_name, health_percent, health_state, updated_at]
      properties:
        group_id: { type: integer }
        group_name: { type: string }
        health_percent: { type: integer, minimum: 0, maximum: 100 }
        health_state: { type: string, enum: [healthy, degraded, down] }
        trend:
          type: array
          items:
            $ref: '#/components/schemas/PoolTrendPoint'
        updated_at: { type: string, format: date-time }
```

```ts
/** Current active contract version — must match contracts/enterprise_bff_openapi_v2.yaml */
export const CONTRACT_VERSION = 'v2'
```

```md
| `enterprise_bff_openapi_v1.yaml` | v1 | Frozen |
| `enterprise_bff_openapi_v2.yaml` | v2 | Active |
```

- [ ] **Step 4: Run build-level verification**

Run: `cd /root/bus2api/frontend && npm run build`
Expected: PASS, and `/root/bus2api/contracts/enterprise_bff_openapi_v2.yaml` exists with `version: v2`.

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add contracts/enterprise_bff_openapi_v2.yaml contracts/README.md frontend/src/lib/contract-headers.ts
git -C /root/bus2api commit -m "docs: freeze enterprise bff v2 contract"
```

### Task 2: Add Shared Pool-Health Math And Snapshot Persistence

**Files:**
- Create: `/root/sub2api-src/backend/internal/service/group_pool_health.go`
- Create: `/root/sub2api-src/backend/internal/service/group_pool_health_test.go`
- Create: `/root/sub2api-src/backend/internal/service/group_health_snapshot.go`
- Create: `/root/sub2api-src/backend/ent/schema/group_health_snapshot.go`
- Create: `/root/sub2api-src/backend/internal/repository/group_health_snapshot_repo.go`
- Create: `/root/sub2api-src/backend/internal/repository/group_health_snapshot_repo_integration_test.go`
- Modify: `/root/sub2api-src/backend/internal/repository/wire.go`
- Modify: `/root/sub2api-src/backend/internal/handler/api_key_handler.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestComputeGroupPoolHealthMatchesExistingRules(t *testing.T) {}
func TestGroupHealthSnapshotRepository_UpsertAndListRecentByGroupIDs(t *testing.T) {}
func TestGroupHealthSnapshotRepository_DeleteBefore(t *testing.T) {}
```

- [ ] **Step 2: Run the tests to prove the shared calculator and snapshot repo do not exist**

Run: `cd /root/sub2api-src/backend && go test ./internal/service/... ./internal/repository/... -run 'TestComputeGroupPoolHealthMatchesExistingRules|TestGroupHealthSnapshotRepository'`
Expected: FAIL because the health helper, snapshot contract, ent schema, and repository are missing.

- [ ] **Step 3: Write the minimal implementation**

```go
type GroupPoolHealth struct {
	AvailableAccountCount   int64
	RateLimitedAccountCount int64
	HealthPercent           int
	HealthState             string
}

func ComputeGroupPoolHealth(group *Group) GroupPoolHealth {
	active := group.ActiveAccountCount
	if active < 0 {
		active = 0
	}
	limited := group.RateLimitedAccountCount
	if limited < 0 {
		limited = 0
	}
	available := active - limited
	if available < 0 {
		available = 0
	}

	percent := 0
	if denominator := available + limited; denominator > 0 {
		percent = int(math.Round(float64(available) * 100 / float64(denominator)))
	} else if available > 0 {
		percent = 100
	}

	state := "healthy"
	switch {
	case available <= 0:
		state = "down"
	case limited > 0:
		state = "degraded"
	}

	return GroupPoolHealth{
		AvailableAccountCount:   available,
		RateLimitedAccountCount: limited,
		HealthPercent:           percent,
		HealthState:             state,
	}
}
```

```go
type GroupHealthSnapshot struct {
	GroupID       int64
	BucketTime    time.Time
	HealthPercent int
	HealthState   string
}

type GroupHealthSnapshotRepository interface {
	UpsertBatch(ctx context.Context, snapshots []GroupHealthSnapshot) error
	ListRecentByGroupIDs(ctx context.Context, groupIDs []int64, since time.Time) (map[int64][]GroupHealthSnapshot, error)
	DeleteBefore(ctx context.Context, cutoff time.Time) (int, error)
}
```

```go
func (GroupHealthSnapshot) Fields() []ent.Field {
	return []ent.Field{
		field.Int64("group_id"),
		field.Time("bucket_time"),
		field.Int("health_percent").Min(0).Max(100),
		field.Enum("health_state").Values("healthy", "degraded", "down"),
	}
}

func (GroupHealthSnapshot) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("group_id", "bucket_time").Unique(),
		index.Fields("bucket_time"),
	}
}
```

```go
func buildUserVisibleGroupPoolStatus(group *service.Group) UserVisibleGroupPoolStatus {
	health := service.ComputeGroupPoolHealth(group)
	active := group.ActiveAccountCount
	if active < 0 {
		active = 0
	}
	return UserVisibleGroupPoolStatus{
		GroupID:                 group.ID,
		GroupName:               group.Name,
		Platform:                group.Platform,
		TotalAccounts:           group.AccountCount,
		ActiveAccountCount:      active,
		RateLimitedAccountCount: health.RateLimitedAccountCount,
		AvailableAccountCount:   health.AvailableAccountCount,
		AvailabilityRatio:       float64(health.HealthPercent) / 100,
		Status:                  health.HealthState,
	}
}
```

- [ ] **Step 4: Generate ent code and rerun the tests**

Run: `cd /root/sub2api-src/backend && make generate && go test ./internal/service/... ./internal/repository/... -run 'TestComputeGroupPoolHealthMatchesExistingRules|TestGroupHealthSnapshotRepository'`
Expected: PASS, including a generated ent client that contains `group_health_snapshots`.

- [ ] **Step 5: Commit**

```bash
git -C /root/sub2api-src add backend/ent/schema/group_health_snapshot.go backend/internal/service/group_pool_health.go backend/internal/service/group_pool_health_test.go backend/internal/service/group_health_snapshot.go backend/internal/repository/group_health_snapshot_repo.go backend/internal/repository/group_health_snapshot_repo_integration_test.go backend/internal/repository/wire.go backend/internal/handler/api_key_handler.go backend/ent backend/cmd/server/wire_gen.go
git -C /root/sub2api-src commit -m "feat(core): persist group health snapshots"
```

### Task 3: Start The Passive Minute-Level Snapshot Collector

**Files:**
- Create: `/root/sub2api-src/backend/internal/service/group_health_history_service.go`
- Create: `/root/sub2api-src/backend/internal/service/group_health_history_service_test.go`
- Modify: `/root/sub2api-src/backend/internal/service/wire.go`
- Modify: `/root/sub2api-src/backend/cmd/server/wire.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestGroupHealthHistoryService_RunOnceStoresCurrentSnapshots(t *testing.T) {}
func TestGroupHealthHistoryService_RunOnceDeletesSnapshotsOlderThanThirtyDays(t *testing.T) {}
```

- [ ] **Step 2: Run the tests to prove the collector is missing**

Run: `cd /root/sub2api-src/backend && go test ./internal/service/... -run 'TestGroupHealthHistoryService'`
Expected: FAIL because the collector service does not exist.

- [ ] **Step 3: Write the minimal implementation**

```go
type GroupHealthHistoryService struct {
	groupRepo     GroupRepository
	snapshotRepo  GroupHealthSnapshotRepository
	interval      time.Duration
	retention     time.Duration
	stopCh        chan struct{}
	stopOnce      sync.Once
	wg            sync.WaitGroup
}

func NewGroupHealthHistoryService(groupRepo GroupRepository, snapshotRepo GroupHealthSnapshotRepository, interval, retention time.Duration) *GroupHealthHistoryService {
	return &GroupHealthHistoryService{
		groupRepo:    groupRepo,
		snapshotRepo: snapshotRepo,
		interval:     interval,
		retention:    retention,
		stopCh:       make(chan struct{}),
	}
}

func (s *GroupHealthHistoryService) runOnce() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	groups, err := s.groupRepo.ListActive(ctx)
	if err != nil {
		log.Printf("[GroupHealthHistory] list active groups failed: %v", err)
		return
	}

	bucket := time.Now().UTC().Truncate(time.Minute)
	snapshots := make([]GroupHealthSnapshot, 0, len(groups))
	for i := range groups {
		health := ComputeGroupPoolHealth(&groups[i])
		snapshots = append(snapshots, GroupHealthSnapshot{
			GroupID:       groups[i].ID,
			BucketTime:    bucket,
			HealthPercent: health.HealthPercent,
			HealthState:   health.HealthState,
		})
	}

	if err := s.snapshotRepo.UpsertBatch(ctx, snapshots); err != nil {
		log.Printf("[GroupHealthHistory] upsert failed: %v", err)
	}
	if _, err := s.snapshotRepo.DeleteBefore(ctx, bucket.Add(-s.retention)); err != nil {
		log.Printf("[GroupHealthHistory] retention cleanup failed: %v", err)
	}
}
```

```go
func ProvideGroupHealthHistoryService(groupRepo GroupRepository, snapshotRepo GroupHealthSnapshotRepository) *GroupHealthHistoryService {
	svc := NewGroupHealthHistoryService(groupRepo, snapshotRepo, time.Minute, 30*24*time.Hour)
	svc.Start()
	return svc
}
```

```go
func provideCleanup(
	groupHealthHistory *service.GroupHealthHistoryService,
) func() {
	return func() {
		if groupHealthHistory != nil {
			groupHealthHistory.Stop()
		}
	}
}
```

- [ ] **Step 4: Run collector tests and compile the server graph**

Run: `cd /root/sub2api-src/backend && go test ./internal/service/... -run 'TestGroupHealthHistoryService' && go test ./cmd/server/...`
Expected: PASS, with the collector started by Wire and stopped during cleanup.

- [ ] **Step 5: Commit**

```bash
git -C /root/sub2api-src add backend/internal/service/group_health_history_service.go backend/internal/service/group_health_history_service_test.go backend/internal/service/wire.go backend/cmd/server/wire.go
git -C /root/sub2api-src commit -m "feat(core): collect group health history in background"
```

### Task 4: Filter Enterprise Visibility And Redact Pool Status In `enterprise-bff`

**Files:**
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/enterprise.go`
- Create: `/root/sub2api-src/backend/internal/enterprisebff/pool_status.go`
- Create: `/root/sub2api-src/backend/internal/enterprisebff/pool_status_test.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/server.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/server_test.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestEnterpriseVisibleGroupsOmitsPublicOnlyGroups(t *testing.T) {}
func TestEnterprisePoolStatusFiltersToExplicitGroupsOnly(t *testing.T) {}
func TestEnterprisePoolStatusReturnsEmptyGroupsWhenNoAssignmentsExist(t *testing.T) {}
```

- [ ] **Step 2: Run the tests to prove the BFF still transparently proxies pool status**

Run: `cd /root/sub2api-src/backend && go test ./internal/enterprisebff/... -run 'TestEnterpriseVisibleGroupsOmitsPublicOnlyGroups|TestEnterprisePoolStatus'`
Expected: FAIL because `/groups/pool-status` still proxies upstream raw counts and `/groups/available` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```go
type EnterpriseVisibleGroup struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

type EnterpriseStore interface {
	MatchUserByEmailAndCompany(ctx context.Context, email, companyName string) (*EnterpriseProfile, error)
	GetByUserID(ctx context.Context, userID int64) (*EnterpriseProfile, error)
	ListVisibleGroups(ctx context.Context, userID int64) ([]EnterpriseVisibleGroup, error)
	SameEnterprise(ctx context.Context, actorUserID, targetUserID int64) (bool, error)
}
```

```go
func (s *entEnterpriseStore) ListVisibleGroups(ctx context.Context, userID int64) ([]EnterpriseVisibleGroup, error) {
	assignedGroupIDs, err := s.listExplicitAllowedGroupIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	subscribedGroupIDs, err := s.listActiveSubscriptionGroupIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	visibleIDs := unionGroupIDs(assignedGroupIDs, subscribedGroupIDs)
	if len(visibleIDs) == 0 {
		return []EnterpriseVisibleGroup{}, nil
	}

	rows, err := s.client.Group.Query().
		Where(group.IDIn(visibleIDs...), group.StatusEQ("active")).
		Order(dbent.Asc(group.FieldSortOrder), dbent.Asc(group.FieldID)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]EnterpriseVisibleGroup, 0, len(rows))
	for _, row := range rows {
		out = append(out, EnterpriseVisibleGroup{ID: row.ID, Name: row.Name, Platform: row.Platform})
	}
	return out, nil
}

func (s *entEnterpriseStore) SameEnterprise(ctx context.Context, actorUserID, targetUserID int64) (bool, error) {
	actor, err := s.GetByUserID(ctx, actorUserID)
	if err != nil || actor == nil {
		return false, err
	}
	target, err := s.GetByUserID(ctx, targetUserID)
	if err != nil || target == nil {
		return false, err
	}
	return normalizeCompanyName(actor.Name) == normalizeCompanyName(target.Name), nil
}

func (s *entEnterpriseStore) listExplicitAllowedGroupIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := s.client.UserAllowedGroup.Query().
		Where(userallowedgroup.UserIDEQ(userID)).
		All(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]int64, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.GroupID)
	}
	return out, nil
}

func (s *entEnterpriseStore) listActiveSubscriptionGroupIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := s.client.UserSubscription.Query().
		Where(
			usersubscription.UserIDEQ(userID),
			usersubscription.StatusEQ(service.SubscriptionStatusActive),
			usersubscription.ExpiresAtGT(time.Now()),
		).
		All(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]int64, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.GroupID)
	}
	return out, nil
}

func unionGroupIDs(left, right []int64) []int64 {
	seen := make(map[int64]struct{}, len(left)+len(right))
	out := make([]int64, 0, len(left)+len(right))
	for _, id := range append(append([]int64{}, left...), right...) {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
```

```go
type Server struct {
	cfg             *Config
	httpClient      *http.Client
	router          *gin.Engine
	adminKeySvc     AdminKeyStore
	enterpriseStore EnterpriseStore
	healthRepo      service.GroupHealthSnapshotRepository
}

func New(cfg *Config, adminKeySvc AdminKeyStore, enterpriseStore EnterpriseStore, healthRepo service.GroupHealthSnapshotRepository) *Server {
	s := &Server{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
		adminKeySvc:     adminKeySvc,
		enterpriseStore: enterpriseStore,
		healthRepo:      healthRepo,
	}
	s.router = s.newRouter()
	return s
}
```

```go
r.GET("/groups/available", s.handleEnterpriseVisibleGroups)
r.GET("/groups/pool-status", s.handleEnterprisePoolStatus)
```

```go
type enterpriseTrendPoint struct {
	BucketTime    string `json:"bucket_time"`
	HealthPercent int    `json:"health_percent"`
	HealthState   string `json:"health_state"`
}

type enterprisePoolStatusGroup struct {
	GroupID       int64                  `json:"group_id"`
	GroupName     string                 `json:"group_name"`
	HealthPercent int                    `json:"health_percent"`
	HealthState   string                 `json:"health_state"`
	Trend         []enterpriseTrendPoint `json:"trend,omitempty"`
	UpdatedAt     string                 `json:"updated_at"`
}

type enterprisePoolStatusResponse struct {
	VisibleGroupCount    int                         `json:"visible_group_count"`
	OverallHealthPercent *int                        `json:"overall_health_percent"`
	UpdatedAt            string                      `json:"updated_at"`
	Groups               []enterprisePoolStatusGroup `json:"groups"`
}
```

```go
func (s *Server) handleEnterprisePoolStatus(c *gin.Context) {
	user, ok := s.requireCurrentUser(c)
	if !ok {
		return
	}

	visibleGroups, err := s.enterpriseStore.ListVisibleGroups(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": http.StatusBadGateway, "message": "Failed to resolve enterprise groups"})
		return
	}
	if len(visibleGroups) == 0 {
		response.Success(c, enterprisePoolStatusResponse{VisibleGroupCount: 0, Groups: []enterprisePoolStatusGroup{}})
		return
	}

	coreResp, err := s.doUpstreamRequest(c.Request.Context(), http.MethodGet, "/groups/pool-status", c.Request.URL.RawQuery, c.Request.Header, nil)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": http.StatusBadGateway, "message": "Failed to reach upstream core"})
		return
	}

	currentGroups, checkedAt, err := decodeUserPoolStatus(coreResp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": http.StatusBadGateway, "message": "Failed to decode upstream pool status"})
		return
	}

	visibleIDs := collectVisibleGroupIDs(visibleGroups)
	history, err := s.healthRepo.ListRecentByGroupIDs(c.Request.Context(), visibleIDs, time.Now().UTC().Add(-24*time.Hour))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": http.StatusBadGateway, "message": "Failed to load pool trend history"})
		return
	}

	response.Success(c, buildEnterprisePoolStatusResponse(visibleGroups, currentGroups, history, checkedAt))
}
```

```go
func collectVisibleGroupIDs(groups []EnterpriseVisibleGroup) []int64 {
	out := make([]int64, 0, len(groups))
	for _, group := range groups {
		out = append(out, group.ID)
	}
	return out
}

func decodeUserPoolStatus(body []byte) (map[int64]handler.UserVisibleGroupPoolStatus, time.Time, error) {
	var envelope struct {
		Data struct {
			CheckedAt string                               `json:"checked_at"`
			Groups    []handler.UserVisibleGroupPoolStatus `json:"groups"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, time.Time{}, err
	}
	checkedAt, err := time.Parse(time.RFC3339, envelope.Data.CheckedAt)
	if err != nil {
		return nil, time.Time{}, err
	}
	out := make(map[int64]handler.UserVisibleGroupPoolStatus, len(envelope.Data.Groups))
	for _, group := range envelope.Data.Groups {
		out[group.GroupID] = group
	}
	return out, checkedAt, nil
}

func buildEnterprisePoolStatusResponse(
	visibleGroups []EnterpriseVisibleGroup,
	currentGroups map[int64]handler.UserVisibleGroupPoolStatus,
	history map[int64][]service.GroupHealthSnapshot,
	checkedAt time.Time,
) enterprisePoolStatusResponse {
	out := make([]enterprisePoolStatusGroup, 0, len(visibleGroups))
	totalPercent := 0

	for _, visible := range visibleGroups {
		current, ok := currentGroups[visible.ID]
		if !ok {
			continue
		}
		totalPercent += int(math.Round(current.AvailabilityRatio * 100))

		trend := make([]enterpriseTrendPoint, 0, len(history[visible.ID]))
		for _, point := range history[visible.ID] {
			trend = append(trend, enterpriseTrendPoint{
				BucketTime:    point.BucketTime.UTC().Format(time.RFC3339),
				HealthPercent: point.HealthPercent,
				HealthState:   point.HealthState,
			})
		}

		out = append(out, enterprisePoolStatusGroup{
			GroupID:       visible.ID,
			GroupName:     visible.Name,
			HealthPercent: int(math.Round(current.AvailabilityRatio * 100)),
			HealthState:   current.Status,
			Trend:         trend,
			UpdatedAt:     checkedAt.UTC().Format(time.RFC3339),
		})
	}

	var overall *int
	if len(out) > 0 {
		value := totalPercent / len(out)
		overall = &value
	}

	return enterprisePoolStatusResponse{
		VisibleGroupCount:    len(visibleGroups),
		OverallHealthPercent: overall,
		UpdatedAt:            checkedAt.UTC().Format(time.RFC3339),
		Groups:               out,
	}
}
```

```go
server := New(
	cfg,
	NewAdminKeyStore(dbResources.Client, dbResources.SQLDB, sharedCfg),
	newEntEnterpriseStore(dbResources.Client, cfg),
	repository.NewGroupHealthSnapshotRepository(dbResources.Client),
)
```

- [ ] **Step 4: Rerun the enterprise BFF tests**

Run: `cd /root/sub2api-src/backend && go test ./internal/enterprisebff/...`
Expected: PASS, with enterprise users receiving only explicitly assigned groups, `200 + []` for zero groups, and no raw count fields.

- [ ] **Step 5: Commit**

```bash
git -C /root/sub2api-src add backend/internal/enterprisebff/enterprise.go backend/internal/enterprisebff/pool_status.go backend/internal/enterprisebff/pool_status_test.go backend/internal/enterprisebff/server.go backend/internal/enterprisebff/server_test.go
git -C /root/sub2api-src commit -m "feat(bff): redact enterprise pool visibility"
```

### Task 5: Reject Unauthorized `group_id` Writes In `enterprise-bff`

**Files:**
- Create: `/root/sub2api-src/backend/internal/enterprisebff/key_authorization.go`
- Create: `/root/sub2api-src/backend/internal/enterprisebff/key_authorization_test.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/server.go`
- Modify: `/root/sub2api-src/backend/internal/enterprisebff/enterprise.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestEnterpriseUserKeyCreateRejectsUnauthorizedGroupID(t *testing.T) {}
func TestEnterpriseAdminKeyCreateRejectsCrossEnterpriseTargetUser(t *testing.T) {}
func TestEnterpriseAdminKeyUpdateAllowsNilGroupIDButRejectsUnauthorizedRebind(t *testing.T) {}
```

- [ ] **Step 2: Run the tests to prove key writes still trust raw `group_id` input**

Run: `cd /root/sub2api-src/backend && go test ./internal/enterprisebff/... -run 'TestEnterpriseUserKeyCreateRejectsUnauthorizedGroupID|TestEnterpriseAdminKeyCreateRejectsCrossEnterpriseTargetUser|TestEnterpriseAdminKeyUpdateAllowsNilGroupIDButRejectsUnauthorizedRebind'`
Expected: FAIL because user writes still proxy directly and admin writes do not check same-enterprise or explicit assignment.

- [ ] **Step 3: Write the minimal implementation**

```go
type requestedGroupBinding struct {
	Present bool
	GroupID *int64
}

func parseRequestedGroupBinding(body []byte) (requestedGroupBinding, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return requestedGroupBinding{}, err
	}
	value, ok := raw["group_id"]
	if !ok {
		return requestedGroupBinding{Present: false}, nil
	}
	if string(value) == "null" {
		return requestedGroupBinding{Present: true, GroupID: nil}, nil
	}
	var id int64
	if err := json.Unmarshal(value, &id); err != nil {
		return requestedGroupBinding{}, err
	}
	return requestedGroupBinding{Present: true, GroupID: &id}, nil
}
```

```go
func (s *Server) authorizeRequestedGroup(ctx context.Context, actor *currentUser, targetUserID int64, binding requestedGroupBinding) error {
	if !binding.Present || binding.GroupID == nil {
		return nil
	}

	sameEnterprise, err := s.enterpriseStore.SameEnterprise(ctx, actor.ID, targetUserID)
	if err != nil {
		return err
	}
	if !sameEnterprise {
		return errors.New("无权使用该号池")
	}

	visibleGroups, err := s.enterpriseStore.ListVisibleGroups(ctx, targetUserID)
	if err != nil {
		return err
	}
	for _, group := range visibleGroups {
		if group.ID == *binding.GroupID {
			return nil
		}
	}
	return errors.New("无权使用该号池")
}
```

```go
func (s *Server) handleRoleAwareKeyCreate(c *gin.Context) {
	user, ok := s.requireCurrentUser(c)
	if !ok {
		return
	}
	if user.Role == "admin" {
		s.renderAdminKeyCreate(c, user)
		return
	}
	s.proxyValidatedKeyMutation(c, user, user.ID, "/keys", transformKeysEnvelope)
}
```

```go
func (s *Server) handleRoleAwareKeyUpdate(c *gin.Context) {
	user, ok := s.requireCurrentUser(c)
	if !ok {
		return
	}
	if user.Role == "admin" {
		s.renderAdminKeyUpdate(c, user)
		return
	}
	s.proxyValidatedKeyMutation(c, user, user.ID, buildPathf("/keys/%s", c.Param("id")), transformKeysEnvelope)
}

func (s *Server) handleAdminKeyUpdate(c *gin.Context) {
	user, ok := s.requireAdmin(c)
	if !ok {
		return
	}
	s.renderAdminKeyUpdate(c, user)
}
```

```go
func (s *Server) proxyValidatedKeyMutation(c *gin.Context, actor *currentUser, targetUserID int64, upstreamPath string, transformer responseTransformer) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}

	binding, err := parseRequestedGroupBinding(body)
	if err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := s.authorizeRequestedGroup(c.Request.Context(), actor, targetUserID, binding); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"code": http.StatusForbidden, "message": err.Error()})
		return
	}

	resp, err := s.doUpstreamRequest(c.Request.Context(), c.Request.Method, upstreamPath, c.Request.URL.RawQuery, c.Request.Header, body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": http.StatusBadGateway, "message": "Failed to reach upstream core"})
		return
	}
	if transformer != nil && isJSONResponse(resp.Header) && len(resp.Body) > 0 {
		if transformed, transformErr := transformer(resp.Body); transformErr == nil {
			resp.Body = transformed
		}
	}
	writeUpstreamResponse(c, resp)
}
```

```go
func (s *Server) renderAdminKeyUpdate(c *gin.Context, currentUser *currentUser) {
	keyID, err := parsePathID(c.Param("id"))
	if err != nil {
		keyID, err = parsePathID(c.Param("keyId"))
	}
	if err != nil {
		response.BadRequest(c, "Invalid key ID")
		return
	}

	existing, err := s.adminKeySvc.Get(c.Request.Context(), keyID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.BadRequest(c, "Invalid request body")
		return
	}
	binding, err := parseRequestedGroupBinding(body)
	if err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if err := s.authorizeRequestedGroup(c.Request.Context(), currentUser, existing.UserID, binding); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"code": http.StatusForbidden, "message": err.Error()})
		return
	}

	var req handler.UpdateAPIKeyRequest
	if err := json.Unmarshal(body, &req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	updateReq := service.UpdateAPIKeyRequest{
		GroupID:             req.GroupID,
		Status:              nilIfEmpty(req.Status),
		IPWhitelist:         req.IPWhitelist,
		IPBlacklist:         req.IPBlacklist,
		Quota:               req.Quota,
		ResetQuota:          req.ResetQuota,
		RateLimit5h:         req.RateLimit5h,
		RateLimit1d:         req.RateLimit1d,
		RateLimit7d:         req.RateLimit7d,
		ResetRateLimitUsage: req.ResetRateLimitUsage,
	}
	updated, err := s.adminKeySvc.Update(c.Request.Context(), keyID, updateReq)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, compatKeyMap(dto.APIKeyFromService(updated)))
}
```

- [ ] **Step 4: Rerun the authorization tests**

Run: `cd /root/sub2api-src/backend && go test ./internal/enterprisebff/...`
Expected: PASS, with absent `group_id` still allowed, `group_id: null` allowed for unbind, and unauthorized bindings rejected with business-safe errors.

- [ ] **Step 5: Commit**

```bash
git -C /root/sub2api-src add backend/internal/enterprisebff/key_authorization.go backend/internal/enterprisebff/key_authorization_test.go backend/internal/enterprisebff/server.go backend/internal/enterprisebff/enterprise.go
git -C /root/sub2api-src commit -m "feat(bff): enforce enterprise group authorization for key writes"
```

### Task 6: Add A Frontend Test Harness For `bus2api`

**Files:**
- Modify: `/root/bus2api/frontend/package.json`
- Modify: `/root/bus2api/frontend/package-lock.json`
- Create: `/root/bus2api/frontend/vitest.config.ts`
- Create: `/root/bus2api/frontend/src/test/setup.ts`

- [ ] **Step 1: Write the failing verification target**

```bash
cd /root/bus2api/frontend
npm run test:run
```

- [ ] **Step 2: Run it to confirm the test script does not exist yet**

Run: `cd /root/bus2api/frontend && npm run test:run`
Expected: FAIL with a missing-script error because the frontend has no test harness.

- [ ] **Step 3: Write the minimal implementation**

```bash
cd /root/bus2api/frontend
npm install -D vitest jsdom @vue/test-utils
```

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test:run": "vitest run"
  }
}
```

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```ts
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
```

- [ ] **Step 4: Verify the new harness works**

Run: `cd /root/bus2api/frontend && npm run test:run -- --passWithNoTests && npm run build`
Expected: PASS, proving the frontend can now run Vitest and still build.

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/setup.ts
git -C /root/bus2api commit -m "test(frontend): add bus2api vitest harness"
```

### Task 7: Cut The Status Page To The Redacted Health-Only Contract

**Files:**
- Modify: `/root/bus2api/frontend/src/api/groups.ts`
- Modify: `/root/bus2api/frontend/src/types/groups.ts`
- Modify: `/root/bus2api/frontend/src/views/status/StatusView.vue`
- Modify: `/root/bus2api/frontend/src/i18n/index.ts`
- Create: `/root/bus2api/frontend/src/views/status/__tests__/StatusView.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('renders health-only cards without raw account totals', async () => {})
it('renders the empty state when no visible groups are returned', async () => {})
it('renders the no-trend message when backend history is empty', async () => {})
```

- [ ] **Step 2: Run the test to prove the current page still exposes counts and page-local history**

Run: `cd /root/bus2api/frontend && npm run test:run -- src/views/status/__tests__/StatusView.spec.ts`
Expected: FAIL because `StatusView.vue` still shows available/limited/total account counts and generates trend history from polling.

- [ ] **Step 3: Write the minimal implementation**

```ts
export interface VisibleGroupOption {
  id: number
  name: string
  platform: string
}

export interface PoolTrendPoint {
  bucket_time: string
  health_percent: number
  health_state: 'healthy' | 'degraded' | 'down'
}

export interface EnterprisePoolStatusGroup {
  group_id: number
  group_name: string
  health_percent: number
  health_state: 'healthy' | 'degraded' | 'down'
  trend: PoolTrendPoint[]
  updated_at: string
}

export interface EnterprisePoolStatusResponse {
  visible_group_count: number
  overall_health_percent: number | null
  updated_at: string
  groups: EnterprisePoolStatusGroup[]
}
```

```ts
export async function getPoolStatus(): Promise<EnterprisePoolStatusResponse> {
  const { data } = await apiClient.get<EnterprisePoolStatusResponse>('/groups/pool-status')
  return data
}
```

```vue
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-label">{{ t('status.visiblePools') }}</div>
    <div class="stat-value">{{ status.visible_group_count }}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">{{ t('status.overallHealthPercent') }}</div>
    <div class="stat-value">{{ formatPercent(status.overall_health_percent) }}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">{{ t('status.lastCheck') }}</div>
    <div class="stat-value status-last-check">{{ formatDateTime(status.updated_at) }}</div>
  </div>
</div>

<article v-for="group in status.groups" :key="group.group_id" class="card pool-card">
  <h2 class="pool-name">{{ group.group_name }}</h2>
  <div class="pool-percent" :class="`percent-${group.health_state}`">
    {{ formatPercent(group.health_percent) }}
  </div>
  <p class="pool-status-text">{{ summaryFor(group.health_state, group.health_percent) }}</p>
  <svg v-if="group.trend.length > 1" class="pool-trend-chart" viewBox="0 0 240 64">
    <polyline :points="sparklinePoints(group.trend)" />
  </svg>
  <p v-else class="pool-trend-empty">{{ t('status.noTrend') }}</p>
</article>
```

```ts
const status = ref<EnterprisePoolStatusResponse>({
  visible_group_count: 0,
  overall_health_percent: null,
  updated_at: '',
  groups: [],
})

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '--'
  return `${Math.round(value)}%`
}

function formatDateTime(value: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function summaryFor(state: EnterprisePoolStatusGroup['health_state'], percent: number): string {
  switch (state) {
    case 'healthy':
      return t('status.groupHealthy', { percent: formatPercent(percent) })
    case 'degraded':
      return t('status.groupDegraded', { percent: formatPercent(percent) })
    default:
      return t('status.groupDown')
  }
}

function sparklinePoints(points: PoolTrendPoint[]): string {
  const fallback = points[0]?.health_percent ?? 0
  const values = points.length > 1
    ? points
    : [
        { bucket_time: '', health_percent: fallback, health_state: 'down' as const },
        { bucket_time: '', health_percent: fallback, health_state: 'down' as const },
      ]
  const stepX = (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1)
  return values.map((point, index) => {
    const x = CHART_PADDING + stepX * index
    const y = CHART_HEIGHT - CHART_PADDING - (point.health_percent / 100) * (CHART_HEIGHT - CHART_PADDING * 2)
    return `${x},${y}`
  }).join(' ')
}
```

```ts
status: {
  description: '展示当前用户已授权号池的健康度与历史趋势，不展示账号绝对数量。',
  overallHealthPercent: '总体健康度',
  noTrend: '暂无趋势数据',
  noGroups: '暂无可用号池',
  noGroupsHint: '请联系管理员为当前账号分配号池。',
}
```

- [ ] **Step 4: Rerun the view test and build**

Run: `cd /root/bus2api/frontend && npm run test:run -- src/views/status/__tests__/StatusView.spec.ts && npm run build`
Expected: PASS, with no raw pool counts rendered anywhere on the status page.

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add frontend/src/api/groups.ts frontend/src/types/groups.ts frontend/src/views/status/StatusView.vue frontend/src/views/status/__tests__/StatusView.spec.ts frontend/src/i18n/index.ts
git -C /root/bus2api commit -m "feat(frontend): render enterprise health-only pool status"
```

### Task 8: Replace Numeric `group_id` Entry With Visible-Group Selectors

**Files:**
- Modify: `/root/bus2api/frontend/src/api/groups.ts`
- Modify: `/root/bus2api/frontend/src/views/keys/KeysView.vue`
- Modify: `/root/bus2api/frontend/src/i18n/index.ts`
- Create: `/root/bus2api/frontend/src/views/keys/__tests__/KeysView.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('loads visible groups and renders a dropdown instead of a numeric group_id input', async () => {})
it('shows a no-visible-groups hint while still allowing an unbound key create flow', async () => {})
```

- [ ] **Step 2: Run the test to prove the page still encourages raw `group_id` entry**

Run: `cd /root/bus2api/frontend && npm run test:run -- src/views/keys/__tests__/KeysView.spec.ts`
Expected: FAIL because `KeysView.vue` still renders `type="number"` inputs for `group_id`.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function getVisibleGroups(): Promise<VisibleGroupOption[]> {
  const { data } = await apiClient.get<VisibleGroupOption[]>('/groups/available')
  return data
}

export const groupsAPI = {
  getPoolStatus,
  getVisibleGroups,
}
```

```vue
<select v-model="filters.group_id" class="input input-sm" @change="fetchKeys">
  <option value="">{{ t('keys.groupAll') }}</option>
  <option v-for="group in visibleGroups" :key="group.id" :value="group.id">
    {{ group.name }}
  </option>
</select>
```

```vue
<select v-model="newKey.group_id" class="input">
  <option :value="null">{{ t('keys.createDialog.noGroup') }}</option>
  <option v-for="group in visibleGroups" :key="group.id" :value="group.id">
    {{ group.name }}
  </option>
</select>
<p v-if="visibleGroups.length === 0" class="empty-hint">
  {{ t('keys.noVisibleGroupsHint') }}
</p>
```

```ts
const visibleGroups = ref<VisibleGroupOption[]>([])

async function loadVisibleGroups(): Promise<void> {
  visibleGroups.value = await groupsAPI.getVisibleGroups()
}

onMounted(async () => {
  await Promise.all([loadVisibleGroups(), fetchKeys()])
})
```

```ts
keys: {
  groupAll: '全部分组',
  noVisibleGroupsHint: '当前没有可分配号池；如需绑定号池，请联系管理员。',
  createDialog: {
    group: '分组',
    groupPlaceholder: '选择已授权分组（可选）',
    noGroup: '不绑定分组',
  },
}
```

- [ ] **Step 4: Rerun the key view test and build**

Run: `cd /root/bus2api/frontend && npm run test:run -- src/views/keys/__tests__/KeysView.spec.ts && npm run build`
Expected: PASS, with dropdown-only group selection and a clear zero-visible-group hint.

- [ ] **Step 5: Commit**

```bash
git -C /root/bus2api add frontend/src/api/groups.ts frontend/src/views/keys/KeysView.vue frontend/src/views/keys/__tests__/KeysView.spec.ts frontend/src/i18n/index.ts
git -C /root/bus2api commit -m "feat(frontend): constrain key flows to visible enterprise groups"
```

## Cross-Repo Verification

Run these before calling the feature complete:

```bash
cd /root/sub2api-src/backend
make generate
go test ./internal/service/... ./internal/repository/... ./internal/handler/... ./internal/enterprisebff/... ./cmd/server/...
```

```bash
cd /root/bus2api/frontend
npm run test:run
npm run build
```

Expected automated outcomes:

- `sub2api` public `/groups/pool-status` still compiles and keeps the old public-user shape.
- The enterprise BFF test suite proves enterprise users and enterprise admins do not inherit `public` groups.
- The enterprise BFF test suite proves unauthorized `group_id` create/update attempts return business-safe rejections.
- Frontend tests prove the enterprise status page renders no raw pool counts and the key page no longer uses numeric `group_id` entry.

## Release Order

1. Deploy `/root/sub2api-src/backend` with the snapshot schema and collector.
2. Deploy `enterprise-bff` from the same repo with filtered `/groups/available`, redacted `/groups/pool-status`, and validated key writes.
3. Deploy `/root/bus2api/frontend` after `v2` contract support is live.
4. Smoke-check an enterprise user with zero assignments, an enterprise user with explicit assignments, and a normal public `sub2api` user before declaring rollout healthy.

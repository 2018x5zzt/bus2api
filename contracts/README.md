# BFF Contract Registry

Frozen OpenAPI specs for the enterprise BFF layer.

| File | Version | Status |
|------|---------|--------|
| `enterprise_bff_openapi_v1.yaml` | v1 | Frozen |
| `enterprise_bff_openapi_v2.yaml` | v2 | Active |

## Rules

- **Never** edit a frozen spec in-place. Create a new version file instead.
- Frontend `X-Contract-Version` header must match the active spec version.
- Breaking changes require a new version bump and migration period.

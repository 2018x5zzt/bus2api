# bus2api Safe Rollout Spec Pack

This pack contains three English documents for handing off to coding agents:

1. `frontend_development_constraints.md`
   - UI scope
   - frontend safety rules
   - frontend acceptance criteria
   - frontend test plan

2. `integration_middle_layer_and_validation.md`
   - anti-corruption layer contract
   - API versioning and headers
   - rollout stages
   - release gates and rollback plan

3. `coding_agent_task_queue.md`
   - executable task queue for all agents
   - phase dependencies
   - acceptance criteria per task

4. `coding_agent_task_manifest.yaml`
   - structured task manifest with dependencies and owners

5. `enterprise_bff_openapi_stub.yaml`
   - OpenAPI 3.0 contract for the enterprise BFF

## Recommended execution order
1. Read integration doc first
2. Implement frontend doc Phase FE-1
3. Implement backend doc architecture skeleton
4. Turn on read-only BFF mode
5. Add write proxy and enterprise metadata features
6. Run canary and rollback drill before production scale-up

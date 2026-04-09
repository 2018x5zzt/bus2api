# Frontend Agent Handoff

Read in this order:
1. frontend_development_constraints.md
2. integration_middle_layer_and_validation.md
3. enterprise_bff_openapi_stub.yaml
4. coding_agent_task_queue.md

Scope:
- Work only on frontend and frontend-facing contract consumption.
- Do not change backend behavior assumptions without contract approval.
- Implement only FE-prefixed tasks first, then shared read-only integration tasks that do not mutate backend.

Primary goals:
- Harden client config and auth handling.
- Build admin UI and enterprise UX on top of the BFF contract.
- Never bypass the BFF to call unstable/private core endpoints.

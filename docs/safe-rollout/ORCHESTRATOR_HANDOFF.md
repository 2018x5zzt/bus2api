# Orchestrator Handoff

Use this pack to coordinate both agents.

Read in this order:
1. README.md
2. integration_middle_layer_and_validation.md
3. enterprise_bff_openapi_stub.yaml
4. coding_agent_task_queue.md
5. coding_agent_task_manifest.yaml

Role:
- Freeze the contract.
- Assign FE tasks to frontend agent and BE tasks to backend agent.
- Block any write rollout until P0 validation passes.

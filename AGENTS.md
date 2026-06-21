# WMS Production Rules

Before edits:
1) Read `/root/QGO_CONTROL/AGENT_HANDOVER.md`
2) Read `/root/QGO_WORKSPACE_PROJECTS/wms/RUNBOOK.md`

Mandatory:
- Snapshot first: `/root/QGO_CONTROL/prod_safety/bin/project-snapshot.sh wms`
- Use safe deploy wrapper for deploy steps.
- Do not touch Fleet/Jobfile from this scope.

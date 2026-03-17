---
name: Security review findings
description: Open security issues from the initial code review (2026-03-17) to address in a future session
type: project
---

# Security Review Findings (2026-03-17)

Issues to iterate on in a future session:

## High Priority

1. **`--network=host` undermines isolation.** The container has full access to the host network — an agent could hit localhost services, cloud metadata endpoints (169.254.169.254), etc. Consider a restricted network with explicit allowlists or a proxy.

2. **Claude's `sandbox.enabled: false` + unrestricted network.** Combined with bind-mounted `.claude` and `.claude.json`, a prompt injection could exfiltrate API keys via the open network. Evaluate re-enabling Claude's sandbox or restricting network egress.

3. **Env vars visible in process list.** `-e VAR=value` in `podman run` args is visible via `ps aux` / `/proc/*/cmdline`. Use `--env-file` or a temp file instead for secrets like API keys.

4. **`mcp__*` wildcard in Claude permissions.** Allows any MCP tool server. A malicious/misconfigured MCP server gets full permissions. Consider narrowing or making configurable.

## Medium Priority

5. **OpenCode config merge overwrites `/workspace/opencode.json`.** `entrypoint.sh` line 26 silently replaces the user's project file with the merged version. Should write to a temp path and point OpenCode at it via env var or flag.

6. **SELinux `:Z` on CWD mount.** The private relabel can break concurrent access from host or other containers. Consider `:z` (shared) for the workspace mount.

7. **No resource limits.** No `--memory`, `--cpus`, or `--pids-limit`. A runaway agent could consume all host resources.

## Low Priority

8. **No exit code forwarding.** The main `podman run` call throws on failure instead of forwarding the container's exit code cleanly.

9. **`.gitconfig` mount ignores XDG layout.** Only mounts `~/.gitconfig`, not `~/.config/git/config`.

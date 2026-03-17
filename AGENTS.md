# AI Agents Guide

This is a Podman-based sandbox for running AI coding tools (Claude Code, OpenCode) in isolated containers.

## Project structure

- `bin/cli.js` — Main CLI entry point, thin wrapper around `podman run`
- `sandbox/Containerfile` — Container image definition
- `sandbox/entrypoint.sh` — In-container command dispatcher
- `sandbox/claude-settings.json` — Claude permission config baked into the image
- `sandbox/opencode-settings.json` — OpenCode permission config baked into the image

## Key design decisions

- No runtime dependencies — the CLI is a minimal Node.js script
- Image version is derived from `package.json` version (they must stay in sync)
- Security relies on Podman isolation + per-tool permission boundaries
- `--userns=keep-id` preserves host UID mapping for file ownership
- SELinux `:Z` labels ensure private volume access

# Contributing

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Podman](https://podman.io/)

## Building the image locally

The production image is built by GitHub CI and pushed to `ghcr.io/data-fair/tool-ai-sandbox`. For local development, build it yourself:

```bash
podman build -t ghcr.io/data-fair/tool-ai-sandbox:0.0.1 -f sandbox/Containerfile sandbox/
```

This tags the image with the same name the CLI expects, so it will be used directly without pulling from the registry.

## Testing

Run the CLI against your local image:

```bash
# Open a shell in the sandbox
node bin/cli.js shell

# Test Claude Code (requires ANTHROPIC_API_KEY)
node bin/cli.js -e ANTHROPIC_API_KEY claude

# Test OpenCode
node bin/cli.js -e OPENROUTER_API_KEY opencode
```

## Project structure

```
bin/
  cli.js                   # Main CLI — thin wrapper around podman run
sandbox/
  Containerfile            # Image definition (built by CI)
  entrypoint.sh            # In-container entrypoint (handles command dispatch, config merging)
  claude-settings.json     # Claude Code settings (baked into image)
  opencode-settings.json   # OpenCode settings (baked into image)
```

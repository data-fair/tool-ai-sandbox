# @data-fair/tool-ai-sandbox

Run AI coding tools (Claude Code, OpenCode) inside a Podman-based sandbox with network access but filesystem isolation.

## Install

```bash
npm i -g @data-fair/tool-ai-sandbox
```

Requires [Podman](https://podman.io/) on the host.

## Usage

```bash
# Run Claude Code in the current directory
df-ai-sandbox -e ANTHROPIC_API_KEY claude

# Run OpenCode
df-ai-sandbox -e OPENROUTER_API_KEY opencode

# Open a shell in the sandbox
df-ai-sandbox shell
```

Use `-e VAR` (repeatable) to forward environment variables to the container.

## How it works

The CLI pulls a pre-built container image and runs your chosen tool inside it with:

- The current directory mounted as `/workspace`
- Host git config and tool state directories bind-mounted
- `--userns=keep-id` for correct file ownership
- `--network=host` for API access

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AGPL-3.0-only](LICENSE)

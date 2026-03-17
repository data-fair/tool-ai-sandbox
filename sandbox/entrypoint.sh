#!/bin/bash
set -euo pipefail

COMMAND="${1:-shell}"
shift 2>/dev/null || true

case "$COMMAND" in
  claude)
    exec claude --settings /etc/ai-sandbox/claude-settings.json "$@"
    ;;
  opencode)
    exec opencode "$@"
    ;;
  shell)
    exec /bin/bash "$@"
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: {claude|opencode|shell}"
    exit 1
    ;;
esac

#!/bin/bash
set -euo pipefail

COMMAND="${1:-shell}"
shift 2>/dev/null || true

case "$COMMAND" in
  claude)
    exec claude --settings /etc/ai-sandbox/claude-settings.json "$@"
    ;;
  opencode)
    # Deep-merge project opencode.json with sandbox permissions
    if [ -f /workspace/opencode.json ]; then
      jq -s '
        def deepmerge: reduce .[] as $item ({}; . as $base | $item | to_entries | reduce .[] as $e ($base;
          if ($e.value | type) == "object" and (.[$e.key] | type) == "object"
          then .[$e.key] = ([.[$e.key], $e.value] | deepmerge)
          else .[$e.key] = $e.value
          end
        ));
        deepmerge
      ' /workspace/opencode.json /etc/ai-sandbox/opencode-settings.json > /tmp/opencode.json
    else
      cp /etc/ai-sandbox/opencode-settings.json /tmp/opencode.json
    fi
    cp /tmp/opencode.json /workspace/opencode.json
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

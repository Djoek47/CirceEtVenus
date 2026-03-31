#!/usr/bin/env bash
# Push Creatix (web/API) and optional sibling mobile repo; optional git tags after push.
#
# Usage:
#   ./scripts/push-all.sh                    # push current branch (default remote)
#   ./scripts/push-all.sh --dry-run          # print commands only
#   ./scripts/push-all.sh --tag v1.2.0       # tag + push tags on each repo (after push)
#
# Set MOBILE_DIR if your Expo clone is not ../creatix-mobile relative to this repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="${MOBILE_DIR:-$ROOT/../creatix-mobile}"
DRY=false
TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY=true
      shift
      ;;
    --tag)
      TAG="${2:-}"
      if [[ -z "$TAG" ]]; then echo "--tag requires a value" >&2; exit 1; fi
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

run() {
  if $DRY; then echo "[dry-run] $*"; else
    eval "$@"
  fi
}

echo "==> Web/API repo: $ROOT"
run "cd \"$ROOT\" && git status -sb"
run "cd \"$ROOT\" && git push"

if [[ -n "$TAG" ]]; then
  echo "==> Tag web repo: $TAG"
  run "cd \"$ROOT\" && git tag -a \"$TAG\" -m \"Release $TAG\" 2>/dev/null || true"
  run "cd \"$ROOT\" && git push origin \"$TAG\""
fi

if [[ -d "$MOBILE_DIR/.git" ]]; then
  echo "==> Mobile repo: $MOBILE_DIR"
  run "cd \"$MOBILE_DIR\" && git status -sb"
  run "cd \"$MOBILE_DIR\" && git push"
  if [[ -n "$TAG" ]]; then
    echo "==> Tag mobile repo: $TAG"
    run "cd \"$MOBILE_DIR\" && git tag -a \"$TAG\" -m \"Release $TAG\" 2>/dev/null || true"
    run "cd \"$MOBILE_DIR\" && git push origin \"$TAG\""
  fi
else
  echo "==> Mobile repo not found at $MOBILE_DIR (set MOBILE_DIR). Skipping."
fi

echo "Done."

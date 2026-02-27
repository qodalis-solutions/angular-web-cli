#!/bin/bash
# Publish all built packages to local Verdaccio registry
# Usage: ./scripts/publish-local.sh
#
# Start verdaccio first:  verdaccio
# Browse packages at:     http://localhost:4873

set -e

REGISTRY="http://localhost:4873"
DIST_DIR="$(cd "$(dirname "$0")/../dist" && pwd)"

# Check verdaccio is running
if ! curl -s "$REGISTRY" > /dev/null 2>&1; then
  echo "Error: Verdaccio is not running at $REGISTRY"
  echo "Start it with:  verdaccio"
  exit 1
fi

# Publish order: core first, then cli, then plugins
PACKAGES=(
  "core"
  "cli"
  "angular-cli"
  "browser-storage"
  "curl"
  "guid"
  "password-generator"
  "qr"
  "regex"
  "server-logs"
  "speed-test"
  "string"
  "text-to-image"
  "todo"
  "yesno"
)

for pkg in "${PACKAGES[@]}"; do
  pkg_dir="$DIST_DIR/$pkg"
  if [ ! -d "$pkg_dir" ]; then
    echo "SKIP  $pkg (not built)"
    continue
  fi

  name=$(grep -m1 '"name"' "$pkg_dir/package.json" | sed 's/.*: "//;s/".*//')
  version=$(grep -m1 '"version"' "$pkg_dir/package.json" | sed 's/.*: "//;s/".*//')

  echo -n "PUBLISH  $name@$version ... "
  if npm publish "$pkg_dir" --registry "$REGISTRY" 2>/dev/null; then
    echo "OK"
  else
    echo "SKIPPED (already published or error)"
  fi
done

echo ""
echo "Done. Browse packages at $REGISTRY"

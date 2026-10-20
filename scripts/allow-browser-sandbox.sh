#!/usr/bin/env bash
# Let the Chrome that agent-browser downloads keep its sandbox on Ubuntu 24.04+.
# Ubuntu blocks unprivileged user namespaces (kernel.apparmor_restrict_unprivileged_userns=1),
# which makes Chrome fail with "No usable sandbox". This adds an AppArmor profile that
# allows them for that one binary only. Needs sudo.
# Usage: scripts/allow-browser-sandbox.sh [--remove]
set -euo pipefail

PROFILE=/etc/apparmor.d/agent-browser-chrome
CHROME_GLOB="${AGENT_BROWSER_HOME:-$HOME/.agent-browser}/browsers/chrome-*/chrome"

if [ "${1:-}" = "--remove" ]; then
  sudo apparmor_parser -R "$PROFILE" 2>/dev/null || true
  sudo rm -f "$PROFILE"
  echo "Removed $PROFILE"
  exit 0
fi

if [ "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns 2>/dev/null || echo 0)" != 1 ]; then
  echo "Unprivileged user namespaces are not restricted here; nothing to do."
  exit 0
fi

# shellcheck disable=SC2086
if ! ls $CHROME_GLOB >/dev/null 2>&1; then
  echo "No Chrome found at $CHROME_GLOB. Run agent-browser once so it downloads one." >&2
  exit 1
fi

sudo tee "$PROFILE" >/dev/null <<EOF
abi <abi/4.0>,
include <tunables/global>
profile agent-browser-chrome $CHROME_GLOB flags=(unconfined) {
  userns,
}
EOF

sudo apparmor_parser -r "$PROFILE"
echo "Loaded $PROFILE. Chrome can now start its sandbox."

#!/bin/bash
# Installs Daily Jazz Guitar on this Mac: builds the app in this folder and adds a "Daily Jazz
# Guitar" app to ~/Applications, which starts the app's local server and opens it in the browser.
# Run it again after pulling changes to rebuild. It needs no admin rights: if the Mac has no
# Node.js 22.6 or later, it downloads a private copy into .mac/ in this folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
cd "$ROOT"
mkdir -p .mac

# Node.js 24 LTS, used only when the Mac has no suitable Node. Checksums are from
# https://nodejs.org/dist/v24.22.1/SHASUMS256.txt.
NODE_VERSION=v24.22.1
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) NODE_DIST=darwin-arm64 NODE_SHA256=89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7 ;;
  Darwin-x86_64) NODE_DIST=darwin-x64 NODE_SHA256=d132557e7ee2b85af08b0c8c34338e65c6430f2238d01f727728ef42dc83b035 ;;
  # Linux too, so the installer can be tested off a Mac. The app it adds is Mac-only.
  Linux-x86_64) NODE_DIST=linux-x64 NODE_SHA256=eb6728e77c576a35162c122c45ccadf224d89ff00abc8dae46cc2897c6002d7c ;;
  *) echo "Daily Jazz Guitar does not support $(uname -sm)." >&2; exit 1 ;;
esac

new_enough() {
  "$1" -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 6) ? 0 : 1)' 2>/dev/null
}

sha256() {
  if command -v shasum >/dev/null; then shasum -a 256 "$1"; else sha256sum "$1"; fi | cut -d ' ' -f 1
}

NODE="$(command -v node || true)"
if [ -z "$NODE" ] || ! new_enough "$NODE"; then
  NODE="$ROOT/.mac/node/bin/node"
  if ! new_enough "$NODE"; then
    echo "Downloading Node.js $NODE_VERSION for this app only…"
    tarball=".mac/node-$NODE_VERSION-$NODE_DIST.tar.gz"
    curl -fL --progress-bar -o "$tarball" "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-$NODE_DIST.tar.gz"
    if [ "$(sha256 "$tarball")" != "$NODE_SHA256" ]; then
      rm -f "$tarball"
      echo "The Node.js download did not match its checksum, so it was not used." >&2
      exit 1
    fi
    rm -rf .mac/node
    mkdir .mac/node
    tar -xzf "$tarball" -C .mac/node --strip-components 1
    rm -f "$tarball"
  fi
fi
# The app runs without a terminal, so it is given the full path to Node.
echo "$NODE" >.mac/node-path
PATH="$(dirname "$NODE"):$PATH"
export PATH
echo "Using Node.js $("$NODE" --version) at $NODE"

echo "Installing packages…"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
echo "Building the app…"
npm run build

# A server left running from an earlier build would keep serving it.
bash "$ROOT/scripts/mac/stop.sh"

if [ "$(uname -s)" = Darwin ]; then
  APP="$HOME/Applications/Daily Jazz Guitar.app"
  start="$ROOT/scripts/mac/start.sh"
  start=${start//\\/\\\\}
  start=${start//\"/\\\"}
  mkdir -p "$HOME/Applications"
  rm -rf "$APP"
  osacompile -o "$APP" \
    -e 'try' \
    -e "  do shell script \"/bin/bash \" & quoted form of \"$start\"" \
    -e 'on error errorText' \
    -e '  display alert "Daily Jazz Guitar could not start" message errorText as critical' \
    -e 'end try'
  cp scripts/mac/AppIcon.icns "$APP/Contents/Resources/applet.icns"
  # Changing the icon breaks the applet's local signature, so it is signed again.
  codesign --force --sign - "$APP" >/dev/null 2>&1 || true
  touch "$APP"
  bash "$ROOT/scripts/mac/start.sh" --no-open
  open "$APP"
  echo
  echo "Daily Jazz Guitar is installed in ~/Applications and open in your browser."
  echo "Open it from there, from Spotlight or from the Dock (drag it there to keep it)."
else
  bash "$ROOT/scripts/mac/start.sh" --no-open
  echo "Daily Jazz Guitar is running at http://localhost:${DJG_PORT:-4747}"
fi

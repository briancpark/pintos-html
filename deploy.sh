#!/usr/bin/env bash
# deploy.sh - Download v86 dependencies and deploy to public_html
#
# Usage: ./deploy.sh [DEPLOY_DIR]
#   DEPLOY_DIR: deployment target (default: ~/public_html/pintos)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="${1:-$HOME/public_html/pintos}"

echo "==> Deploying to $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Download v86 emulator files if not present
cd "$DEPLOY_DIR"
for file in libv86.js:https://copy.sh/v86/build/libv86.js             v86.wasm:https://copy.sh/v86/build/v86.wasm             seabios.bin:https://copy.sh/v86/bios/seabios.bin             vgabios.bin:https://copy.sh/v86/bios/vgabios.bin; do
    name="${file%%:*}"
    url="${file#*:}"
    if [ ! -f "$name" ]; then
        echo "    Downloading $name..."
        wget -q "$url" -O "$name"
    else
        echo "    $name already exists, skipping."
    fi
done

# Copy HTML
echo "    Copying index.html..."
cp "$SCRIPT_DIR/index.html" "$DEPLOY_DIR/index.html"

# Copy disk image
if [ -f "$SCRIPT_DIR/cs162proj.dsk" ]; then
    echo "    Copying cs162proj.dsk..."
    cp "$SCRIPT_DIR/cs162proj.dsk" "$DEPLOY_DIR/cs162proj.dsk"
else
    echo "    Warning: cs162proj.dsk not found. Run build.sh first."
fi

echo "Done! Site deployed to $DEPLOY_DIR"

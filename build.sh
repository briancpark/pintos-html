#!/usr/bin/env bash
# build.sh - Build Pintos kernel and create a bootable disk image
#
# Usage: ./build.sh [PINTOS_SRC_DIR]
#   PINTOS_SRC_DIR: path to the pintos source tree (default: ~/pintos/src)

set -euo pipefail

PINTOS_SRC="${1:-$HOME/pintos/src}"
UTILS_DIR="$PINTOS_SRC/utils"
VM_DIR="$PINTOS_SRC/vm"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$PINTOS_SRC" ]; then
    echo "Error: Pintos source directory not found at $PINTOS_SRC"
    echo "Usage: $0 [PINTOS_SRC_DIR]"
    exit 1
fi

# Ensure clang wrapper exists (OCF doesn't have clang installed)
if ! command -v clang &>/dev/null; then
    echo "clang not found, creating gcc wrapper at ~/bin/clang..."
    mkdir -p ~/bin
    cat > ~/bin/clang << 'CLANG_WRAPPER'
#!/bin/bash
# Wrapper: delegates to gcc, filtering out clang-specific flags
args=()
skip_next=0
for arg in "$@"; do
    if [ "$skip_next" = "1" ]; then
        skip_next=0
        continue
    fi
    case "$arg" in
        -target) skip_next=1; continue ;;
        *) args+=("$arg") ;;
    esac
done
exec gcc "${args[@]}"
CLANG_WRAPPER
    chmod +x ~/bin/clang
fi

export PATH="$HOME/bin:$UTILS_DIR:$PATH"

echo "==> Building Pintos VM project..."
cd "$VM_DIR"
make clean
make

echo "==> Creating bootable disk image..."
cd "$VM_DIR/build"
chmod u+x ../../../utils/bootable-cs162.sh
chmod u+x ../../utils/pintos-set-cmdline
bash ../../../utils/bootable-cs162.sh --simple

echo "==> Copying disk image to $SCRIPT_DIR..."
cp cs162proj.dsk "$SCRIPT_DIR/cs162proj.dsk"

echo "Done! Disk image: $SCRIPT_DIR/cs162proj.dsk"

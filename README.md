# Pintos HTML

A web-based interface for [Pintos](https://pintos-os.org/), the educational operating system from UC Berkeley's CS 162. Boots a real Pintos kernel in your browser using the [v86](https://github.com/copy/v86) JavaScript x86 emulator.

## Live Demo

[https://www.ocf.berkeley.edu/~briancpark/pintos/](https://www.ocf.berkeley.edu/~briancpark/pintos/)

## Features

- Boots the full Pintos kernel (VM project) in-browser via WebAssembly x86 emulation
- Interactive shell with user programs: `ls`, `cat`, `echo`, `cp`, `mkdir`, `rm`, and more
- PC speaker audio emulation (`railroad162` plays "I've Been Working on My Pintos")
- Serial output rendering for clean terminal display
- PS/2 keyboard input via scancode translation

## Setup

### Prerequisites

- A built [Pintos](https://github.com/briancpark/pintos) source tree
- GCC with 32-bit support (`gcc -m32`)
- QEMU (`qemu-system-i386`)
- Perl
- `wget`

### Build & Deploy

```bash
# 1. Build the Pintos kernel and create a bootable disk image
./build.sh ~/pintos/src

# 2. Download v86 dependencies and deploy to a web directory
./deploy.sh ~/public_html/pintos
```

### How It Works

1. **build.sh** compiles the Pintos VM project and runs `bootable-cs162.sh` to create a disk image with the kernel, shell, and user programs baked in
2. **deploy.sh** downloads the v86 emulator (JS + WASM + BIOS files) and copies the HTML + disk image to the deployment directory
3. **index.html** loads v86, boots the disk image, captures serial output for display, and translates browser keyboard events to PS/2 scancodes

## Available Shell Commands

| Command | Description |
|---------|-------------|
| `ls` | List files |
| `cat <file>` | Print file contents |
| `echo <text>` | Echo text |
| `cp <src> <dst>` | Copy a file |
| `cmp <a> <b>` | Compare two files |
| `mkdir <dir>` | Create a directory |
| `rm <file>` | Remove a file |
| `hex-dump <file>` | Hex dump a file |
| `railroad162` | Play "I've Been Working on My Pintos" |
| `halt` | Shut down Pintos |

## Created by Brian Park

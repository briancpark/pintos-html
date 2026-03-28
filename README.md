# Pintos HTML

A web-based interface for [Pintos](https://pintos-os.org/), the educational operating system from UC Berkeley's CS 162. Boots a real Pintos kernel in your browser using the [v86](https://github.com/copy/v86) JavaScript x86 emulator.

Now featuring **Llama 2 (15M) LLM inference** running directly on Pintos, ported from [karpathy/llama2.c](https://github.com/karpathy/llama2.c).

## Live Demo

[https://www.ocf.berkeley.edu/~briancpark/pintos/](https://www.ocf.berkeley.edu/~briancpark/pintos/)

## Features

- Boots the full Pintos kernel (VM project) in-browser via WebAssembly x86 emulation
- **LLM inference**: Run Llama 2 (stories15M) to generate text, entirely within the Pintos OS
- Interactive shell with user programs: `ls`, `cat`, `echo`, `cp`, `mkdir`, `rm`, and more
- PC speaker audio emulation: Pokemon Red/Blue theme (`contest`), I have Been Working on My Pintos (`railroad162` "I've Been Working on My Pintos")
- Serial output rendering for clean terminal display
- PS/2 keyboard input via scancode translation
- Mobile-friendly with virtual keyboard support

## Running Llama 2 on Pintos

Once the shell boots, run:

```
llama2 model -i "Once upon a time" -n 64
```

This loads the 15M parameter Llama 2 model (split into 8MB chunks to fit the Pintos filesystem limit) and generates text token by token. The model weights (~60MB) are baked into the disk image and loaded at runtime.

Options:
- `-i <prompt>` - input prompt
- `-n <steps>` - number of tokens to generate (default: 256)
- `-t <temp>` - temperature (default: 1.0, 0.0 = greedy)
- `-s <seed>` - random seed (default: 42)

## Setup

### Prerequisites

- A built [Pintos](https://github.com/briancpark/pintos) source tree (with llama2 in examples)
- GCC with 32-bit support (`gcc -m32`)
- QEMU (`qemu-system-i386`)
- Perl, `wget`

### Build & Deploy

```bash
# 1. Build the Pintos kernel and create a bootable disk image (~80MB with LLM weights)
./build.sh ~/pintos/src

# 2. Download v86 dependencies and deploy to a web directory
./deploy.sh ~/public_html/pintos
```

### How It Works

1. **build.sh** compiles the Pintos VM project and runs `bootable-cs162.sh` to create a disk image with the kernel, shell, user programs, and LLM model weights
2. **deploy.sh** downloads the v86 emulator (JS + WASM + BIOS files) and copies the HTML + disk image to the deployment directory
3. **index.html** loads v86 with 128MB RAM, boots the disk image, captures serial output for display, and translates browser keyboard events to PS/2 scancodes
4. **llama2** loads split model weights (`model.00`-`model.07`) and `tokenizer.bin` from the Pintos filesystem and runs transformer inference using custom math routines (no math.h in Pintos)

## Available Shell Commands

| Command | Description |
|---------|-------------|
| `llama2 model [opts]` | Run Llama 2 (15M) text generation |
| `ls` | List files |
| `cat <file>` | Print file contents |
| `echo <text>` | Echo text |
| `cp <src> <dst>` | Copy a file |
| `mkdir <dir>` | Create a directory |
| `rm <file>` | Remove a file |
| `hex-dump <file>` | Hex dump a file |
| `contest` | Play Pokemon Red/Blue title screen theme |
| `railroad162` | Play "I've Been Working on My Pintos" |
| `halt` | Shut down Pintos |

## Created by Brian Park

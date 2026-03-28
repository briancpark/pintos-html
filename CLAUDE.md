# Pintos HTML - Project Context

## Overview

This project wraps a Pintos OS kernel in a browser-based x86 emulator (v86) so it can be interacted with via a web page. Hosted on OCF (UC Berkeley's Open Computing Facility). Features LLM inference (Llama 2 15M) running directly on Pintos.

## Architecture

- **index.html**: Single-page app. Uses v86 to boot a raw Pintos disk image with 128MB RAM. Serial output is captured for clean text rendering (avoids VGA double-spacing issues). Keyboard input is translated to PS/2 scancodes since Pintos reads from the PS/2 keyboard, not serial. Mobile support via hidden textarea overlay.
- **build.sh**: Builds the Pintos VM project from source and creates a bootable disk image via `bootable-cs162.sh --simple`. Includes a clang-to-gcc wrapper for environments (like OCF) that lack clang.
- **deploy.sh**: Downloads v86 runtime files (libv86.js, v86.wasm, BIOS ROMs) from copy.sh and copies everything to the web directory.

## Key Technical Decisions

- **Serial output over VGA**: v86's VGA text rendering produces double-spaced output with blank lines. Capturing `serial0-output-byte` events gives clean text.
- **PS/2 scancodes for input**: Pintos shell reads stdin from the keyboard controller, not serial. Sending characters via `serial0_send()` only echoes them back without the shell processing them. Must use `keyboard_send_scancodes()` with proper Set 1 make/break codes.
- **clang wrapper**: The Pintos build system uses clang for `stack-align` tests. OCF lacks clang, so `build.sh` creates a `~/bin/clang` wrapper that delegates to gcc (filtering `-target` flag).
- **Audio**: v86 includes PC speaker emulation (Web Audio API square wave oscillator). Pintos `tone()` syscall programs PIT channel 2. AudioContext must be resumed after user interaction (browser autoplay policy).
- **128MB RAM**: Required for Llama 2 inference. The 15M parameter model needs ~60MB for weights plus working memory for activations.
- **80MB disk image**: The stories15M model is ~60MB, split into 8MB chunks (model.00-model.07) due to Pintos filesystem file size limits. Plus tokenizer.bin (~434KB) and user programs.
- **LLM on Pintos**: llama2.c is ported from karpathy/llama2.c with custom math functions (sqrtf, expf, etc.) since Pintos has no math.h. Model loading reassembles split chunks at runtime.

## Pintos Source

The Pintos kernel source lives separately at ~/pintos (or github.com/briancpark/pintos). This repo only contains the web frontend and build/deploy scripts.

## Deployment

Hosted at: https://www.ocf.berkeley.edu/~briancpark/pintos/
Web root: ~/public_html/pintos/ (symlinked to /services/http/users/b/briancpark)

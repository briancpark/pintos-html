"use strict";
var emulator;
var term = document.getElementById("term");
var mobileInput = document.getElementById("mobile-input");
var audioEnabled = false;

/* ---- Custom PC Speaker ----
 * v86's built-in speaker creates AudioContext before user gesture (blocked
 * by iOS Safari) and routes to left channel only. We disable it and create
 * our own AudioContext on first tap, connected to destination (stereo). */
var speakerCtx = null, speakerOsc = null, speakerGain = null;
var speakerListenersAdded = false;

function setupSpeakerListeners() {
    if (speakerListenersAdded || !emulator) return;
    speakerListenersAdded = true;
    emulator.add_listener("pcspeaker-enable", function() {
        if (speakerGain && speakerCtx)
            speakerGain.gain.setValueAtTime(0.3, speakerCtx.currentTime);
    });
    emulator.add_listener("pcspeaker-disable", function() {
        if (speakerGain && speakerCtx)
            speakerGain.gain.setValueAtTime(0, speakerCtx.currentTime);
    });
    emulator.add_listener("pcspeaker-update", function(data) {
        if (!speakerOsc || !speakerCtx) return;
        var mode = data[0], reload = data[1];
        if (mode === 3 && reload > 0) {
            var freq = 1193181.6666 / reload;
            if (freq > 0 && freq < 20000)
                speakerOsc.frequency.setValueAtTime(freq, speakerCtx.currentTime);
        }
    });
}

// Idempotent: safe to call on every user gesture. We must NOT early-return when
// audioEnabled is already set, because the AudioContext may have been created in
// a "suspended" state (when first called programmatically from emulator-ready,
// with no user gesture) and can only be resumed from within a real gesture. On
// origins without prior media engagement (e.g. a fresh GitHub Pages domain) the
// context always starts suspended, so every gesture must retry resume().
function enableAudio() {
    if (!speakerCtx) {
        try {
            speakerCtx = new (window.AudioContext || window.webkitAudioContext)();
            speakerOsc = speakerCtx.createOscillator();
            speakerOsc.type = "square";
            speakerOsc.frequency.setValueAtTime(440, speakerCtx.currentTime);
            speakerGain = speakerCtx.createGain();
            speakerGain.gain.setValueAtTime(0, speakerCtx.currentTime);
            speakerOsc.connect(speakerGain);
            speakerGain.connect(speakerCtx.destination);
            speakerOsc.start();
        } catch(e) { console.warn("Audio init failed:", e); return; }
    }
    if (speakerCtx.state === "suspended") speakerCtx.resume();
    setupSpeakerListeners();
    if (!audioEnabled) {
        audioEnabled = true;
        var btn = document.getElementById("audio-btn");
        btn.textContent = "Audio Enabled";
        btn.classList.add("enabled");
    }
}

/* ---- Keyboard ---- */
var SCANCODES = {
    "a":0x1E,"b":0x30,"c":0x2E,"d":0x20,"e":0x12,"f":0x21,"g":0x22,
    "h":0x23,"i":0x17,"j":0x24,"k":0x25,"l":0x26,"m":0x32,"n":0x31,
    "o":0x18,"p":0x19,"q":0x10,"r":0x13,"s":0x1F,"t":0x14,"u":0x16,
    "v":0x2F,"w":0x11,"x":0x2D,"y":0x15,"z":0x2C,
    "1":0x02,"2":0x03,"3":0x04,"4":0x05,"5":0x06,"6":0x07,"7":0x08,
    "8":0x09,"9":0x0A,"0":0x0B,
    " ":0x39,"-":0x0C,"=":0x0D,"[":0x1A,"]":0x1B,";":0x27,
    "'":0x28,"`":0x29,"\\":0x2B,",":0x33,".":0x34,"/":0x35
};
var SHIFT_MAP = {
    "!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8",
    "(":"9",")":"0","_":"-","+":"=","{":"[","}":"]",":":";",
    "\"":"'","~":"`","|":"\\","<":",",">":".","?":"/"
};
var LSHIFT = 0x2A;

function sendKey(ch) {
    if (!emulator || !emulator.is_running()) return;
    var needShift = false;
    var base = ch.toLowerCase();
    if (SHIFT_MAP[ch]) { base = SHIFT_MAP[ch]; needShift = true; }
    else if (ch >= "A" && ch <= "Z") { base = ch.toLowerCase(); needShift = true; }
    var code = SCANCODES[base];
    if (code === undefined) return;
    var codes = [];
    if (needShift) codes.push(LSHIFT);
    codes.push(code);
    codes.push(code | 0x80);
    if (needShift) codes.push(LSHIFT | 0x80);
    emulator.keyboard_send_scancodes(codes);
}

function focusInput() {
    mobileInput.focus();
    term.classList.add("focused");
    enableAudio();
}

mobileInput.addEventListener("keydown", function(e) {
    if (!emulator || !emulator.is_running()) return;
    enableAudio();
    if (window.PintosBG) window.PintosBG.key();
    if (e.key === "Enter") {
        e.preventDefault();
        emulator.keyboard_send_scancodes([0x1C, 0x9C]);
        mobileInput.value = "";
    } else if (e.key === "Backspace") {
        e.preventDefault();
        emulator.keyboard_send_scancodes([0x0E, 0x8E]);
    } else if (e.key === "Tab") {
        e.preventDefault();
        emulator.keyboard_send_scancodes([0x0F, 0x8F]);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        sendKey(e.key);
    }
});

var prevValue = "";
mobileInput.addEventListener("input", function() {
    if (!emulator || !emulator.is_running()) return;
    enableAudio();
    if (window.PintosBG) window.PintosBG.key();
    var cur = mobileInput.value;
    if (cur.length < prevValue.length) {
        emulator.keyboard_send_scancodes([0x0E, 0x8E]);
    } else if (cur.length > prevValue.length) {
        var added = cur.slice(prevValue.length);
        for (var i = 0; i < added.length; i++) {
            if (added[i] === "\n") {
                emulator.keyboard_send_scancodes([0x1C, 0x9C]);
            } else {
                sendKey(added[i]);
            }
        }
    }
    prevValue = cur;
    if (cur.length > 100) { mobileInput.value = ""; prevValue = ""; }
});

mobileInput.addEventListener("blur", function() { term.classList.remove("focused"); });
mobileInput.addEventListener("focus", function() { term.classList.add("focused"); });

/* ---- Emulator ---- */
// Download the 84MB disk into memory and boot from it. We must support two very
// different servers:
//   - OCF/Apache: serves the file uncompressed. A single 84MB GET gets reset by
//     some networks ("network error"), so we download in 8MB Range chunks.
//   - GitHub Pages/Cloudflare: gzip-compresses the disk and applies Range to the
//     *compressed* bytes, so real offsets past the compressed size return HTTP
//     416. There a single GET is correct (the browser decompresses transparently).
// We probe the first chunk and pick the strategy from the Content-Range total.
// (XHR, not fetch() — fetch() failed outright in some browsers/proxies.)
var CHUNK_SIZE = 8 * 1024 * 1024;

function setProgress(statusEl, fillEl, received, total) {
    var pct = Math.min(100, Math.floor(received / total * 100));
    fillEl.style.width = pct + "%";
    statusEl.textContent = "Downloading Pintos disk… " + pct + "%";
}

// One Range request -> {status, buffer, total} (total parsed from Content-Range).
function xhrRange(url, start, end) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.setRequestHeader("Range", "bytes=" + start + "-" + end);
        xhr.onload = function() {
            if (xhr.status !== 206 && xhr.status !== 200) { reject(new Error("HTTP " + xhr.status)); return; }
            var total = -1, cr = xhr.getResponseHeader("Content-Range");
            if (cr) { var m = cr.match(/\/(\d+)\s*$/); if (m) total = parseInt(m[1], 10); }
            resolve({ status: xhr.status, buffer: xhr.response, total: total });
        };
        xhr.onerror = function() { reject(new Error("network error")); };
        xhr.send();
    });
}

// Single full GET with progress; browser decompresses any Content-Encoding.
function xhrFull(url, statusEl, fillEl) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onprogress = function(e) {
            if (e.lengthComputable && e.total) {
                var pct = Math.min(100, Math.floor(e.loaded / e.total * 100));
                fillEl.style.width = pct + "%";
                statusEl.textContent = "Downloading Pintos disk… " + pct + "%";
            } else {
                statusEl.textContent = "Downloading Pintos disk… " + (e.loaded >> 20) + " MB";
            }
        };
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 206) { fillEl.style.width = "100%"; resolve(xhr.response); }
            else reject(new Error("HTTP " + xhr.status));
        };
        xhr.onerror = function() { reject(new Error("network error")); };
        xhr.send();
    });
}

async function retry(fn, n) {
    for (var attempt = 1; ; attempt++) {
        try { return await fn(); }
        catch (e) { if (attempt >= n) throw e; await new Promise(function(r) { setTimeout(r, 500 * attempt); }); }
    }
}

async function downloadDisk(url, statusEl, fillEl, total) {
    // Probe first chunk to decide strategy. Any probe failure (e.g. Pages may
    // error decoding a partial gzip range) just routes us to the single GET.
    var first = null;
    try { first = await retry(function() { return xhrRange(url, 0, CHUNK_SIZE - 1); }, 2); }
    catch (e) { first = null; }
    var expectFirst = Math.min(CHUNK_SIZE, total);
    var honestRanges = !!first && first.status === 206 && first.total === total &&
                       first.buffer && first.buffer.byteLength === expectFirst;

    if (!honestRanges) {
        // Ranges are compressed/ignored (GitHub Pages gzip) -> single GET.
        return await retry(function() { return xhrFull(url, statusEl, fillEl); }, 3);
    }

    // Honest byte ranges (OCF/Apache) -> chunk to avoid one huge transfer.
    var out = new Uint8Array(total);
    out.set(new Uint8Array(first.buffer), 0);
    var received = first.buffer.byteLength;
    setProgress(statusEl, fillEl, received, total);
    for (var start = CHUNK_SIZE; start < total; start += CHUNK_SIZE) {
        var end = Math.min(start + CHUNK_SIZE, total) - 1;
        var s = start, e2 = end;
        var r = await retry(function() { return xhrRange(url, s, e2); }, 4);
        out.set(new Uint8Array(r.buffer), s);
        received += r.buffer.byteLength;
        setProgress(statusEl, fillEl, received, total);
    }
    return out.buffer;
}

window.onload = async function() {
    var statusEl = document.getElementById("status");
    var track = document.getElementById("progress-track");
    var fillEl = document.getElementById("progress-fill");
    var diskBuffer;

    track.style.display = "block";
    statusEl.textContent = "Downloading Pintos disk… 0%";
    for (var attempt = 1; ; attempt++) {
        try {
            diskBuffer = await downloadDisk("cs162proj.dsk?v=20260603", statusEl, fillEl, 84639744);
            break;
        } catch (e) {
            if (attempt >= 3) {
                statusEl.textContent = "Failed to download Pintos disk: " + e.message;
                statusEl.style.color = "#e57373";
                track.style.display = "none";
                return;
            }
            statusEl.textContent = "Download failed (" + e.message + "), retrying…";
            fillEl.style.width = "0%";
            await new Promise(function(r) { setTimeout(r, 600 * attempt); });
        }
    }
    track.style.display = "none";
    statusEl.textContent = "Booting Pintos kernel…";

    emulator = new V86({
        wasm_path: "v86.wasm",
        memory_size: 128 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        screen_container: document.getElementById("screen_container"),
        bios: { url: "seabios.bin" },
        vga_bios: { url: "vgabios.bin" },
        hda: { buffer: diskBuffer },
        autostart: true,
        disable_mouse: true,
        disable_keyboard: true,
        disable_speaker: true,
    });

    emulator.add_listener("serial0-output-byte", function(byte) {
        if (window.PintosBG) window.PintosBG.out();
        var ch = String.fromCharCode(byte);
        if (byte === 0x08) {
            term.textContent = term.textContent.slice(0, -1);
        } else {
            term.textContent += ch;
        }
        term.scrollTop = term.scrollHeight;
    });

    // Drive the background animation from the PC speaker too, independent of
    // whether audio output is enabled (these bus events fire regardless).
    emulator.add_listener("pcspeaker-update", function(data) {
        if (!window.PintosBG) return;
        var mode = data[0], reload = data[1];
        if (mode === 3 && reload > 0) {
            var freq = 1193181.6666 / reload;
            if (freq > 0 && freq < 20000) window.PintosBG.tone(freq);
        }
    });
    emulator.add_listener("pcspeaker-enable", function() {
        if (window.PintosBG) window.PintosBG.burst(0.5);
    });

    emulator.add_listener("emulator-ready", function() {
        document.getElementById("status").textContent = "Pintos kernel booted! Tap terminal to type.";
        document.getElementById("status").style.color = "#66bb6a";
        if (window.PintosBG) window.PintosBG.burst(1.0);
        focusInput();
    });
};

function resetEmulator() {
    term.textContent = "";
    mobileInput.value = "";
    prevValue = "";
    speakerListenersAdded = false;
    emulator.restart();
    document.getElementById("status").textContent = "Restarting...";
    if (audioEnabled) setupSpeakerListeners();
}

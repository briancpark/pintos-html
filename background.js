/* background.js — Reactive Perlin flow-field triangle tessellation.
 *
 * A black canvas fills the screen behind the terminal. A triangular wireframe
 * mesh (no fill) flows via animated Perlin noise — each vertex drifts along a
 * noise vector field. Every triangle edge has its own randomly-assigned rainbow
 * hue (slowly rotating). Terminal activity feeds energy in, brightening the
 * edges and sending ripples through the mesh:
 *   - OS serial output  -> window.PintosBG.out()   (per byte, throttled)
 *   - keystrokes        -> window.PintosBG.key()
 *   - PC-speaker tone    -> window.PintosBG.tone(freq)  (hue shift, even if muted)
 *   - big events (boot)  -> window.PintosBG.burst(amt)
 * Degrades silently if p5 isn't available. */
(function () {
    "use strict";
    if (typeof p5 === "undefined") return;

    var sketch = function (p) {
        var spacing, cols, rows, base, hue;   // hue[j][i] = [hueTriA, hueTriB]
        var zoff = 0;
        var energy = 0;       // global activity, decays each frame
        var toneShift = 0;    // hue nudge from speaker frequency, decays
        var hueRot = 0;       // global slow rainbow rotation
        var pulses = [];
        var MAX_PULSES = 14;

        function buildGrid() {
            spacing = Math.max(46, Math.min(92, Math.floor(p.width / 22)));
            cols = Math.ceil(p.width / spacing) + 4;   // overscan so wandering edges still cover screen
            rows = Math.ceil(p.height / spacing) + 4;
            base = [];
            hue = [];
            for (var j = 0; j <= rows; j++) {
                base[j] = [];
                hue[j] = [];
                for (var i = 0; i <= cols; i++) {
                    base[j][i] = {
                        x: (i - 2) * spacing + (Math.random() - 0.5) * spacing * 0.8, // jittered off-grid
                        y: (j - 2) * spacing + (Math.random() - 0.5) * spacing * 0.8,
                        s: Math.random() * 1000,        // independent noise seed
                        sp: 0.5 + Math.random() * 1.4   // independent wander speed (more variety = freer idle)
                    };
                    hue[j][i] = [Math.random() * 360, Math.random() * 360];
                }
            }
        }

        p.setup = function () {
            var c = p.createCanvas(p.windowWidth, p.windowHeight);
            c.parent("bg");
            p.colorMode(p.HSB, 360, 100, 100, 1);
            p.frameRate(30);
            p.noiseDetail(3, 0.5);
            buildGrid();
        };

        p.windowResized = function () {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
            buildGrid();
        };

        // Each vertex wanders independently along its OWN Perlin path (unique
        // seed + speed), so the mesh is irregular and never reads as a grid.
        function wander(v, amp) {
            var nx = p.noise(v.s, zoff * v.sp);
            var ny = p.noise(v.s + 47.3, zoff * v.sp);
            return { x: v.x + (nx - 0.5) * 2 * amp, y: v.y + (ny - 0.5) * 2 * amp };
        }

        function rippleAt(cx, cy) {
            if (!pulses.length) return 0;
            var r = 0;
            for (var k = 0; k < pulses.length; k++) {
                var pl = pulses[k];
                var d = Math.abs(Math.hypot(cx - pl.x, cy - pl.y) - pl.r);
                if (d < 80) r += (1 - d / 80) * (pl.life / pl.maxLife);
            }
            return r;
        }

        p.draw = function () {
            p.background(0);
            zoff += 0.0045 + energy * 0.008;   // a bit more idle drift; only a gentle speed-up when active
            hueRot = (hueRot + 0.3 + energy * 2.5) % 360;
            energy *= 0.97;   // slower decay -> reactions stay energized longer
            toneShift *= 0.95;
            for (var k = pulses.length - 1; k >= 0; k--) {
                pulses[k].r += 14;
                pulses[k].life -= 1;
                if (pulses[k].life <= 0) pulses.splice(k, 1);
            }

            // Constant amplitude (NOT scaled by energy): keeps the mesh a valid
            // tessellation so triangles never flip/overlap into spikes when active.
            // Slightly larger so vertices roam a bit more freely at idle.
            var amp = spacing * 0.6;
            var P = [];
            for (var j = 0; j <= rows; j++) {
                P[j] = [];
                for (var i = 0; i <= cols; i++) P[j][i] = wander(base[j][i], amp);
            }

            p.noFill();
            p.strokeWeight(2.5);
            for (var j2 = 0; j2 < rows; j2++) {
                for (var i2 = 0; i2 < cols; i2++) {
                    var a = P[j2][i2], b = P[j2][i2 + 1];
                    var c = P[j2 + 1][i2], d = P[j2 + 1][i2 + 1];
                    edge(a, b, c, hue[j2][i2][0]);
                    edge(b, d, c, hue[j2][i2][1]);
                }
            }
        };

        function edge(a, b, c, baseHue) {
            var cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
            var rip = rippleAt(cx, cy);
            var bright = 16 + energy * 45 + rip * 80;
            if (bright > 100) bright = 100;
            var alpha = 0.30 + energy * 0.4 + rip * 0.6;
            if (alpha > 1) alpha = 1;
            var h = (((baseHue + hueRot + toneShift * 60) % 360) + 360) % 360;
            p.stroke(h, 90, bright, alpha);
            p.triangle(a.x, a.y, b.x, b.y, c.x, c.y);
        }

        function addPulse(x, y, life) {
            if (pulses.length >= MAX_PULSES) pulses.shift();
            pulses.push({ x: x, y: y, r: 0, life: life, maxLife: life });
        }

        window.PintosBG = {
            // big discrete event (e.g. boot complete)
            burst: function (amt) {
                energy = Math.min(1.6, energy + (amt || 0.3));
                addPulse(p.random(p.width), p.random(p.height * 0.2, p.height * 0.9), 46);
            },
            // per-byte OS output: always nudges energy, ripples occasionally
            out: function () {
                energy = Math.min(1.6, energy + 0.05);
                if (Math.random() < 0.12) addPulse(p.random(p.width), p.random(p.height * 0.2, p.height * 0.9), 40);
            },
            // a keystroke
            key: function () {
                energy = Math.min(1.6, energy + 0.1);
                addPulse(p.random(p.width), p.random(p.height), 28);
            },
            // PC-speaker frequency -> hue shift (fires even if audio is muted)
            tone: function (freq) {
                if (!freq || freq <= 0) return;
                toneShift = Math.max(-1, Math.min(1, (Math.log(freq) / Math.log(4000)) - 0.6));
                energy = Math.min(1.6, energy + 0.06);
            }
        };
    };

    function start() { new p5(sketch); }
    if (document.readyState !== "loading") start();
    else document.addEventListener("DOMContentLoaded", start);
})();

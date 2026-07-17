/* ============================================================
   Brain Arcade — core framework
   Registry, router, settings, sound, storage, UI helpers.
   ============================================================ */
(function () {
    "use strict";

    var GAMES = [];
    var current = null;      // { def, cleanup }
    var route = "home";      // 'home' | 'game' | 'settings'

    /* ---------- storage ---------- */
    var LS = window.localStorage;
    function load(key, dflt) {
        try { var v = LS.getItem("ba_" + key); return v === null ? dflt : JSON.parse(v); }
        catch (e) { return dflt; }
    }
    function save(key, val) {
        try { LS.setItem("ba_" + key, JSON.stringify(val)); } catch (e) {}
    }

    var settings = load("settings", { theme: "dark", sound: true, haptics: true });
    function applyTheme() {
        document.documentElement.setAttribute("data-theme", settings.theme === "light" ? "light" : "dark");
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", settings.theme === "light" ? "#F4F6FF" : "#0B1020");
    }
    applyTheme();

    /* ---------- sound engine (WebAudio blips) ---------- */
    var actx = null;
    function ac() {
        if (!actx) {
            try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
        }
        if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
        return actx;
    }
    function tone(freq, dur, type, vol) {
        if (!settings.sound) return;
        var c = ac(); if (!c) return;
        try {
            var o = c.createOscillator(), g = c.createGain();
            o.type = type || "square";
            o.frequency.value = freq;
            g.gain.value = (vol == null ? 0.06 : vol);
            o.connect(g); g.connect(c.destination);
            var t = c.currentTime;
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.start(t); o.stop(t + dur);
        } catch (e) {}
    }
    var Sound = {
        click: function () { tone(420, 0.05, "square", 0.05); },
        move:  function () { tone(300, 0.04, "triangle", 0.04); },
        good:  function () { tone(660, 0.08, "square", 0.06); setTimeout(function(){ tone(880, 0.09, "square", 0.06); }, 70); },
        bad:   function () { tone(160, 0.18, "sawtooth", 0.06); },
        tick:  function () { tone(520, 0.03, "square", 0.035); },
        win:   function () { [523,659,784,1047].forEach(function (f, i) { setTimeout(function(){ tone(f, 0.14, "square", 0.06); }, i * 90); }); },
        lose:  function () { [400,300,200].forEach(function (f, i) { setTimeout(function(){ tone(f, 0.16, "sawtooth", 0.06); }, i * 110); }); },
        pop:   function () { tone(740, 0.05, "sine", 0.05); }
    };

    function haptic(ms) {
        if (!settings.haptics) return;
        try {
            if (window.AndroidBridge && window.AndroidBridge.vibrate) { window.AndroidBridge.vibrate(ms || 15); return; }
            if (navigator.vibrate) navigator.vibrate(ms || 15);
        } catch (e) {}
    }

    /* ---------- DOM helpers ---------- */
    function el(tag, props, kids) {
        var n = document.createElement(tag);
        if (props) {
            for (var k in props) {
                if (k === "class") n.className = props[k];
                else if (k === "html") n.innerHTML = props[k];
                else if (k === "text") n.textContent = props[k];
                else if (k === "style") n.setAttribute("style", props[k]);
                else if (k.slice(0, 2) === "on" && typeof props[k] === "function") n.addEventListener(k.slice(2), props[k]);
                else if (props[k] != null) n.setAttribute(k, props[k]);
            }
        }
        if (kids != null) {
            if (!Array.isArray(kids)) kids = [kids];
            kids.forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
        }
        return n;
    }

    var toastTimer = null;
    function toast(msg) {
        var t = document.getElementById("toast");
        t.textContent = msg; t.hidden = false;
        requestAnimationFrame(function () { t.classList.add("show"); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            t.classList.remove("show");
            setTimeout(function () { t.hidden = true; }, 250);
        }, 1600);
    }

    /* ---------- best scores ---------- */
    function bestKey(id) { return "best_" + id; }
    function getBest(id) { return load(bestKey(id), null); }
    function setBest(id, value, mode) {
        var cur = getBest(id);
        var better = cur == null ||
            (mode === "low" ? value < cur : value > cur);
        if (better) { save(bestKey(id), value); return true; }
        return false;
    }

    /* ---------- registry ---------- */
    function register(def) { GAMES.push(def); }

    /* ---------- overlay helper ---------- */
    function overlay(opts) {
        var host = document.getElementById("view");
        var ov = el("div", { class: "overlay" });
        var panel = el("div", { class: "panel pop" });
        if (opts.emoji) panel.appendChild(el("div", { class: "big", text: opts.emoji }));
        panel.appendChild(el("h2", { text: opts.title || "" }));
        if (opts.sub) panel.appendChild(el("p", { html: opts.sub }));
        var row = el("div", { class: "btn-row" });
        (opts.buttons || []).forEach(function (b) {
            row.appendChild(el("button", {
                class: "btn " + (b.primary ? "primary" : ""),
                text: b.label,
                onclick: function () { close(); if (b.onClick) b.onClick(); }
            }));
        });
        panel.appendChild(row);
        ov.appendChild(panel);
        document.body.appendChild(ov);
        function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
        ov._close = close;
        return ov;
    }
    function clearOverlays() {
        document.querySelectorAll(".overlay").forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); });
    }

    /* ---------- api passed to games ---------- */
    function makeApi(def) {
        return {
            el: el,
            sound: Sound,
            haptic: haptic,
            toast: toast,
            overlay: overlay,
            getBest: function () { return getBest(def.id); },
            setBest: function (v) { return setBest(def.id, v, def.best || "high"); },
            save: function (k, v) { save(def.id + "_" + k, v); },
            load: function (k, d) { return load(def.id + "_" + k, d); },
            settings: settings,
            exit: function () { go("home"); }
        };
    }

    /* ---------- rendering ---------- */
    var view = null;
    function setView() { view = document.getElementById("view"); }

    function renderHome() {
        route = "home"; current = null;
        document.getElementById("backBtn").hidden = true;
        view.innerHTML = "";
        var hero = el("div", { class: "hero fade-in" }, [
            el("h1", { text: "Play. Think. Repeat." }),
            el("p", { text: GAMES.length + " brain-teasing games in one arcade. Beat your best scores!" })
        ]);
        view.appendChild(hero);
        view.appendChild(el("div", { class: "section-label", text: "All Games" }));

        var grid = el("div", { class: "grid" });
        GAMES.forEach(function (def) {
            var best = getBest(def.id);
            var bestStr = best == null ? "Tap to play" :
                (def.bestLabel || "Best") + ": " + best + (def.bestSuffix || "");
            var card = el("div", { class: "game-card fade-in", style: "background:" + (def.gradient || "linear-gradient(135deg,#7C5CFF,#22D3EE)") }, [
                el("div", { class: "art", style: def.art || "" }),
                el("div", { class: "glass" }),
                el("div", { class: "ico", html: def.icon || "&#127918;" }),
                el("div", { class: "meta" }, [
                    el("div", { class: "name", text: def.name }),
                    el("div", { class: "best", text: bestStr })
                ])
            ]);
            card.addEventListener("click", function () { Sound.click(); haptic(12); openGame(def); });
            grid.appendChild(card);
        });
        view.appendChild(grid);
        view.appendChild(el("div", { class: "small-note", html: "Made with &#128150; — everything runs offline on your device." }));
        window.scrollTo(0, 0);
    }

    function openGame(def) {
        route = "game";
        clearOverlays();
        document.getElementById("backBtn").hidden = false;
        view.innerHTML = "";
        var host = el("div", { class: "game-host fade-in" });
        view.appendChild(host);
        var api = makeApi(def);
        var cleanup = null;
        try { cleanup = def.mount(host, api); } catch (e) { toast("Game failed to load"); console.error(e); }
        current = { def: def, cleanup: typeof cleanup === "function" ? cleanup : null };
        window.scrollTo(0, 0);
    }

    function renderSettings() {
        route = "settings";
        clearOverlays();
        document.getElementById("backBtn").hidden = false;
        view.innerHTML = "";
        var wrap = el("div", { class: "fade-in" });
        wrap.appendChild(el("div", { class: "section-label", text: "Appearance" }));

        var g1 = el("div", { class: "settings-group" });
        // Theme segmented
        var themeRow = el("div", { class: "setting-row" }, [
            el("div", { class: "s-ico", html: "&#127912;" }),
            el("div", { class: "s-text" }, [
                el("div", { class: "s-title", text: "Theme" }),
                el("div", { class: "s-sub", text: "Choose light or dark mode" })
            ])
        ]);
        g1.appendChild(themeRow);
        var seg = el("div", { class: "seg", style: "margin:0 16px 15px" });
        ["dark", "light"].forEach(function (mode) {
            var b = el("button", { class: settings.theme === mode ? "active" : "", text: mode === "dark" ? "Dark" : "Light" });
            b.addEventListener("click", function () {
                settings.theme = mode; save("settings", settings); applyTheme();
                seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
                b.classList.add("active"); Sound.click(); haptic(10);
            });
            seg.appendChild(b);
        });
        g1.appendChild(seg);
        wrap.appendChild(g1);

        wrap.appendChild(el("div", { class: "section-label", text: "Feedback" }));
        var g2 = el("div", { class: "settings-group" });
        g2.appendChild(toggleRow("&#128266;", "Sound effects", "Retro blips while you play", "sound"));
        g2.appendChild(toggleRow("&#128243;", "Haptics", "Vibrate on key moments", "haptics"));
        wrap.appendChild(g2);

        wrap.appendChild(el("div", { class: "section-label", text: "Data" }));
        var g3 = el("div", { class: "settings-group" });
        var resetRow = el("div", { class: "setting-row" }, [
            el("div", { class: "s-ico", html: "&#128465;" }),
            el("div", { class: "s-text" }, [
                el("div", { class: "s-title", text: "Reset high scores" }),
                el("div", { class: "s-sub", text: "Clear every saved best score" })
            ]),
            el("button", { class: "btn", text: "Reset", onclick: function () {
                overlay({
                    emoji: "&#9888;&#65039;", title: "Reset all scores?",
                    sub: "This can't be undone.",
                    buttons: [
                        { label: "Cancel" },
                        { label: "Reset", primary: true, onClick: function () {
                            GAMES.forEach(function (d) { try { LS.removeItem("ba_" + bestKey(d.id)); } catch (e) {} });
                            toast("High scores cleared"); Sound.good();
                        } }
                    ]
                });
            } })
        ]);
        g3.appendChild(resetRow);
        wrap.appendChild(g3);

        wrap.appendChild(el("div", { class: "small-note", html: "Brain Arcade v1.0 &#183; " + GAMES.length + " games &#183; Offline &amp; private" }));
        view.appendChild(wrap);
        window.scrollTo(0, 0);
    }

    function toggleRow(icon, title, sub, key) {
        var input = el("input", { type: "checkbox" });
        input.checked = !!settings[key];
        input.addEventListener("change", function () {
            settings[key] = input.checked; save("settings", settings);
            if (settings[key]) { Sound.click(); haptic(10); }
        });
        var sw = el("label", { class: "switch" }, [input, el("span", { class: "track" }), el("span", { class: "thumb" })]);
        return el("div", { class: "setting-row" }, [
            el("div", { class: "s-ico", html: icon }),
            el("div", { class: "s-text" }, [
                el("div", { class: "s-title", text: title }),
                el("div", { class: "s-sub", text: sub })
            ]),
            sw
        ]);
    }

    /* ---------- router ---------- */
    function teardown() {
        if (current && current.cleanup) { try { current.cleanup(); } catch (e) {} }
        current = null;
        clearOverlays();
    }
    function go(where, arg) {
        teardown();
        if (where === "home") renderHome();
        else if (where === "settings") renderSettings();
        else if (where === "game" && arg) openGame(arg);
    }

    function handleBack() {
        // Return true if handled (don't exit app), false to allow exit.
        if (document.querySelector(".overlay")) { clearOverlays(); return true; }
        if (route === "game" || route === "settings") { Sound.click(); go("home"); return true; }
        return false;
    }

    /* ---------- boot ---------- */
    function boot() {
        setView();
        document.getElementById("backBtn").addEventListener("click", function () { Sound.click(); haptic(10); go("home"); });
        document.getElementById("settingsBtn").addEventListener("click", function () { Sound.click(); haptic(10); route === "settings" ? go("home") : go("settings"); });
        document.getElementById("title").addEventListener("click", function () { if (route !== "home") go("home"); });
        // unlock audio on first touch
        var unlock = function () { ac(); window.removeEventListener("touchstart", unlock); window.removeEventListener("mousedown", unlock); };
        window.addEventListener("touchstart", unlock);
        window.addEventListener("mousedown", unlock);
        renderHome();
    }

    /* ---------- public ---------- */
    window.BrainGames = {
        register: register,
        boot: boot,
        handleBack: handleBack,
        toast: toast,
        go: go
    };
})();

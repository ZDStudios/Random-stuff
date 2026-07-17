/* Wordle */
(function () {
    var WORDS = ("apple brave crane drink eagle flame ghost house input joker knife lemon money night ocean piano queen river stone table under vivid water xenon yield zebra actor angel beach bloom charm cloud dance dream earth fairy field fruit giant glory grape happy heart honey ivory jelly juice light lucky lunar magic maple metal mirth noble north olive onion orbit paint pearl pilot plant pride prize proud pulse quiet quilt raven reach robin royal salsa sandy scale scout shine shore smile snowy solar spice spark storm sugar sunny sweet swirl think tiger toast tulip unity urban valor vapor venom vocal wagon whale wheat witty world worth zesty amber blaze cabin candy cedar chess climb coral crisp curve delta dizzy elbow ember fable feast fjord flock focus forge frost glide grill grove hatch hazel humor jazzy joust karma kiosk koala label larva llama lodge maize mango medal mocha mound mural nifty nudge oaken plaza pluck poker quark quest ranch relay rhino rugby sable scarf sloth spade swing tango tempo thorn tidal torch trend trunk vault waltz weave woven yacht yearn zonal").toUpperCase().split(" ");
    var SET = {}; WORDS.forEach(function (w) { SET[w] = 1; });

    window.BrainGames.register({
        id: "wordle", name: "Wordle", icon: "&#128221;",
        gradient: "linear-gradient(135deg,#16A34A,#22D3EE)",
        best: "high", bestLabel: "Streak",
        mount: function (host, api) {
            var target, row, col, board, letters, done, streak = api.load("streak", 0);

            var sStreak = stat("Streak", streak + ""), sBest = stat("Best", (api.getBest() || 0) + "");
            host.appendChild(api.el("div", { class: "game-topline" }, [sStreak.box, sBest.box]));

            var boardEl = api.el("div", { style: "display:grid;grid-template-rows:repeat(6,1fr);gap:6px;margin:6px 0" });
            host.appendChild(api.el("div", { class: "board-wrap" }, boardEl));
            var kbEl = api.el("div", { style: "display:flex;flex-direction:column;gap:6px;width:100%;max-width:400px" });
            host.appendChild(kbEl);
            host.appendChild(api.el("div", { class: "btn-row" }, [ api.el("button", { class: "btn ghost", text: "New word", onclick: reset }) ]));

            function stat(k, v) { var val = api.el("div", { class: "v", text: v }); return { box: api.el("div", { class: "stat" }, [api.el("div", { class: "k", text: k }), val]), val: val }; }

            var tiles = [];
            function buildBoard() {
                boardEl.innerHTML = ""; tiles = [];
                for (var r = 0; r < 6; r++) {
                    var rowEl = api.el("div", { style: "display:grid;grid-template-columns:repeat(5,1fr);gap:6px" });
                    for (var c = 0; c < 5; c++) {
                        var t = api.el("div", { style: tileStyle("transparent") });
                        tiles.push(t); rowEl.appendChild(t);
                    }
                    boardEl.appendChild(rowEl);
                }
            }
            function tileStyle(bg) { return "aspect-ratio:1;min-height:44px;display:grid;place-items:center;font-weight:800;font-size:22px;border-radius:8px;border:2px solid var(--line);background:" + bg + ";color:#fff;text-transform:uppercase"; }

            var keyEls = {};
            var ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
            function buildKb() {
                kbEl.innerHTML = ""; keyEls = {};
                ROWS.forEach(function (rw, idx) {
                    var rowEl = api.el("div", { style: "display:flex;gap:5px;justify-content:center" });
                    if (idx === 2) rowEl.appendChild(keyBtn("ENTER", 1.5));
                    rw.split("").forEach(function (ch) { rowEl.appendChild(keyBtn(ch, 1)); });
                    if (idx === 2) rowEl.appendChild(keyBtn("DEL", 1.5));
                    kbEl.appendChild(rowEl);
                });
            }
            function keyBtn(label, flex) {
                var b = api.el("button", { class: "btn", style: "flex:" + flex + ";padding:12px 0;font-size:13px;min-width:0", html: label === "DEL" ? "&#9003;" : label });
                b.addEventListener("click", function () { press(label); });
                if (label.length === 1) keyEls[label] = b;
                return b;
            }

            function press(k) {
                if (done) return;
                if (k === "ENTER") return submit();
                if (k === "DEL") { if (col > 0) { col--; tiles[row * 5 + col].textContent = ""; letters[row][col] = ""; } return; }
                if (col < 5) { tiles[row * 5 + col].textContent = k; letters[row][col] = k; col++; api.sound.tick(); }
            }
            function submit() {
                if (col < 5) { api.toast("Not enough letters"); shake(); return; }
                var guess = letters[row].join("");
                if (!SET[guess] && guess !== target) { /* lenient: allow, but warn if clearly unknown */ }
                var res = score(guess, target);
                for (var i = 0; i < 5; i++) {
                    (function (i) { setTimeout(function () {
                        var t = tiles[row * 5 + i];
                        t.style.background = res[i] === 2 ? "#16A34A" : res[i] === 1 ? "#CA8A04" : "#3A3F55";
                        t.style.borderColor = t.style.background;
                        t.classList.add("pop");
                        var kb = keyEls[guess[i]];
                        if (kb) { var pr = kb._state || 0, ns = res[i]; if (ns >= pr) { kb._state = ns; kb.style.background = t.style.background; kb.style.color = "#fff"; } }
                    }, i * 180); })(i);
                }
                api.sound.move();
                if (guess === target) {
                    done = true; setTimeout(function () {
                        streak++; api.save("streak", streak); var rec = api.setBest(streak); sStreak.val.textContent = streak; sBest.val.textContent = api.getBest();
                        api.sound.win(); api.haptic(30);
                        api.overlay({ emoji: "&#127881;", title: "Solved!", sub: "The word was <b>" + target + "</b><br>Streak: " + streak + (rec ? " &#127942;" : ""),
                            buttons: [ { label: "Home", onClick: api.exit }, { label: "Next word", primary: true, onClick: reset } ] });
                    }, 950);
                } else {
                    row++; col = 0;
                    if (row >= 6) { done = true; setTimeout(function () {
                        streak = 0; api.save("streak", 0); sStreak.val.textContent = 0; api.sound.lose();
                        api.overlay({ emoji: "&#128533;", title: "Out of guesses", sub: "The word was <b>" + target + "</b>",
                            buttons: [ { label: "Home", onClick: api.exit }, { label: "Try again", primary: true, onClick: reset } ] });
                    }, 950); }
                }
            }
            function score(guess, tgt) {
                var res = [0,0,0,0,0], t = tgt.split(""), used = [false,false,false,false,false];
                for (var i = 0; i < 5; i++) if (guess[i] === t[i]) { res[i] = 2; used[i] = true; }
                for (var i = 0; i < 5; i++) { if (res[i]) continue; for (var j = 0; j < 5; j++) { if (!used[j] && guess[i] === t[j]) { res[i] = 1; used[j] = true; break; } } }
                return res;
            }
            function shake() { boardEl.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 200 }); }

            function reset() {
                target = WORDS[Math.floor(Math.random() * WORDS.length)];
                row = 0; col = 0; done = false;
                letters = []; for (var r = 0; r < 6; r++) letters.push(["","","","",""]);
                buildBoard(); buildKb();
            }
            function key(e) {
                var k = e.key.toUpperCase();
                if (k === "ENTER") press("ENTER"); else if (k === "BACKSPACE") press("DEL"); else if (/^[A-Z]$/.test(k)) press(k);
            }
            window.addEventListener("keydown", key);
            reset();
            return function () { window.removeEventListener("keydown", key); };
        }
    });
})();

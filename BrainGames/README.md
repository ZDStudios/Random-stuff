# 🧠 Brain Arcade

A polished offline Android app packing **17 brain-teasing games** into one arcade —
Tetris, Block Blast, Wordle, 2048 and more — with a nice UI, dark/light themes,
sound, haptics, and per-game high scores. Everything runs locally on the device;
no network, no ads, no tracking.

## 🎮 Games included

| | | |
|---|---|---|
| 🧩 Tetris | 🟧 Block Blast | 🎲 2048 |
| 📝 Wordle | 🐍 Snake | 🃏 Memory Match |
| 💣 Minesweeper | 🔢 Sudoku | 🔮 Simon Says |
| ⭕ Tic-Tac-Toe (AI) | 🔵 Connect Four (AI) | 🏓 Breakout |
| 🐺 Whack-a-Mole | 🔀 15 Puzzle | 🐦 Flappy Bird |
| 🏓 Pong (AI) | ⚡ Reaction Time | |

Each game tracks a personal best that's saved on the device. There's a Settings
screen for theme, sound effects, haptics, and resetting scores.

## 📱 How to get the APK

The APK is built automatically by **GitHub Actions** (the workflow lives at
`.github/workflows/android.yml`). To download an installable APK:

1. Go to the repo's **Actions** tab → **Build Brain Arcade APK**.
2. Open the latest successful run (or click **Run workflow** to start one).
3. Download the **`BrainArcade-debug-apk`** artifact — it contains
   `BrainArcade-debug.apk`.
4. Copy it to your Android phone and open it. You may need to allow
   *"Install from unknown sources"* for your file manager / browser.
   *(A manual `workflow_dispatch` run also publishes the APK to a
   `brain-arcade-latest` GitHub Release for easy phone download.)*

> The build produces a **debug-signed** APK — perfect for installing and playing.
> For the Play Store you'd swap in a release signing key.

## 🛠️ Building locally

If you have the Android SDK installed (`ANDROID_HOME` set):

```bash
cd BrainGames
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

## 🧱 How it works

The app is a small native **WebView** shell (`MainActivity.java`) that loads a
self-contained HTML/CSS/JS game engine from `app/src/main/assets/www/`. That keeps
the app tiny and fast while making the games easy to extend:

```
app/src/main/assets/www/
├── index.html          # shell + script includes
├── css/style.css       # theme, layout, components
├── js/app.js           # registry, router, settings, sound, storage
└── js/games/*.js        # one file per game (self-registering)
```

Adding a game is just dropping a new `js/games/xyz.js` that calls
`window.BrainGames.register({ id, name, icon, gradient, mount })` and adding a
`<script>` line to `index.html`.

## 🔐 Privacy

100% offline. No internet permission is requested. Scores and settings are stored
only in the device's local storage.

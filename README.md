# Tournament OBS — Live Esports Overlay Pack

This repository contains a customized version of the SPX Graphics Controller, preconfigured with live esports tournament overlay templates that synchronize in real-time with Google Sheets.

> **Server Command:** `node server.js`  
> **Control Panel:** [http://localhost:5656](http://localhost:5656)  
> **OBS Overlay Source:** [http://localhost:5656/renderer/scalable](http://localhost:5656/renderer/scalable)

---

## 🎮 Included Graphic Templates

Both templates are located in [ASSETS/templates/tournament/](file:///d:/SPX-GC-master/SPX-GC-master/ASSETS/templates/tournament/).

### 1. Live Scoreboard Panel (`LIVE_SCOREBOARD.html`)
A sleek right-side leaderboard showing teams, kills, and alive status.
* **Auto-Sync**: Polls your Google Sheet every 2 seconds.
* **Visual Bar Parsing**: Automatically reads and counts block indicators (e.g. `▌▌▌▌` = 4 players alive).
* **Instant Out Highlights**: Automatically strikethroughs the team name and colors the row red when the team is eliminated.
* **Lag-Free**: Dynamic setTimeout polling queue keeps OBS rendering at a smooth 60fps.

### 2. Elimination Banner (`ELIMINATION_BANNER.html`)
A broadcast-grade center-screen banner for showing team eliminations.
* Plays an elastic enter-animation showing the team name and their total kills.
* Clears automatically after 4 seconds.

---

## ⚡ Setup Guide (Faster-than-Light Updates)

To make your edits in Google Sheets reflect in OBS **instantly (within 2 seconds)**:

1. **Share your Google Sheet**:
   * Open your Google Sheet in the browser.
   * Click **Share** (top-right).
   * Change **General access** from *Restricted* to **"Anyone with the link can view"** (so SPX can read the live database).
2. **Copy the Browser Link**:
   * Copy the direct URL from your browser's address bar (e.g., `https://docs.google.com/spreadsheets/d/1Lm61yqAgFFZRIOQxlsK_27s7B77vtOiYk9g_Uq-EZ_8/edit?gid=1030597977#gid=1030597977`).
3. **Configure SPX**:
   * Start SPX: Run `node server.js` and open `http://localhost:5656`.
   * Open the **Tournament** rundown.
   * Click **Tournament Live Scoreboard**.
   * Paste your copied address bar link into the **Google Sheet CSV URL** field.
   * Click **PLAY**.

---

## 📁 Repository Structure

```
SPX-GC-master/
├── server.js                        ← Main web server entry point
├── config.json                      ← App configuration & port settings
├── package.json                     ← Dependencies list
│
├── ASSETS/
│   └── templates/
│       └── tournament/
│           ├── LIVE_SCOREBOARD.html  ← Leaderboard template (customized)
│           └── ELIMINATION_BANNER.html ← Elimination popup template (customized)
│
├── DATAROOT/
│   └── MyFirstProject/
│       ├── profile.json             ← Preconfigured template definitions
│       └── data/
│           └── Tournament.json      ← Preconfigured rundown cue list
│
├── routes/
│   ├── routes-application.js        ← Web page routers
│   └── routes-api.js                ← Backend CORS bypass proxy (/api/fetchUrl)
│
└── static/                          ← Frontend CSS, JS, fonts, and assets
```

---

## 🛠️ Tech Stack & Custom Logic

* **Node.js / Express**: Runs the web server controller.
* **Socket.IO**: Real-time events between SPX Controller and the OBS Overlay.
* **Anime.js**: High-performance CSS transforms and spring physics animations.
* **CORS Proxy**: Resolves client-side Google Sheet CORS blocks by routing requests through the server.
* **DOM State Guard**: Ensures the elimination banner triggers exactly once per team to prevent infinite animation loops.

---

## 📜 MIT License
Copyright 2020-2026 Tuomo Kulomaa & SPX Graphics. All tournament-specific logic and styling extensions are open-source.
